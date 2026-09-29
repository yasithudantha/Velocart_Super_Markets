using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using Stripe;
using Stripe.Checkout;
using velocart_system.API.Data;
using velocart_system.API.Features.Orders.Models;
using velocart_system.API.Features.Orders.DTOs;
using velocart_system.API.Services; 
using velocart_system.API.Features.Inventory.Models;
using velocart_system.API.Features.Cart.Models;
using velocart_system.API.Features.Loyalty.Models;
using velocart_system.API.Features.Promotions.Models;
using velocart_system.API.Features.Identity.Models; 
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Orders.Controllers
{
    public class UpdateOrderStatusDto { public string Status { get; set; } = string.Empty; }
    public class UpdateDeliveryDetailsDto { public string DeliveryNumber { get; set; } = string.Empty; public DateTime? EstimatedDeliveryDate { get; set; } public string EstimatedDeliveryTime { get; set; } = string.Empty; public string AssignedDriverName { get; set; } = string.Empty; public string AssignedDriverContact { get; set; } = string.Empty; public string DeliveryNotes { get; set; } = string.Empty; }
    public class SubmitComplaintDto { public string Subject { get; set; } = string.Empty; public string Description { get; set; } = string.Empty; }

    public class AddOrderLocationDto 
    { 
        public double Latitude { get; set; } 
        public double Longitude { get; set; } 
        public string PlaceName { get; set; } = string.Empty; 
    }

    public class AIResolutionDto
    {
        public int ComplaintId { get; set; }
        public decimal RefundAmount { get; set; }
        public int CompensatoryPoints { get; set; }
        public string ResolutionNotes { get; set; } = string.Empty;
    }

    // NEW: Customer Refund Choice DTO with strict regex validation
    public class ChooseRefundMethodDto
    {
        [Required]
        [RegularExpression("^(OriginalPayment|LoyaltyPoints)$", ErrorMessage = "Invalid refund method selected. Must be OriginalPayment or LoyaltyPoints.")]
        public string RefundMethod { get; set; } = string.Empty;
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IImageService _imageService; // NEW

        public OrdersController(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService, IImageService imageService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _imageService = imageService; // NEW
        }

        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new UnauthorizedAccessException("Invalid token claims.");
        }

        [HttpPost("checkout")]
        public async Task<ActionResult<CheckoutResponseDto>> Checkout([FromBody] CheckoutRequestDto request)
        {
            int secureUserId = GetSecureUserId();

            if (!string.IsNullOrEmpty(request.IdempotencyKey))
            {
                var existingOrder = await _context.Orders.FirstOrDefaultAsync(o => o.IdempotencyKey == request.IdempotencyKey && o.UserId == secureUserId);
                if (existingOrder != null) return Ok(new CheckoutResponseDto { OrderNumber = existingOrder.OrderNumber, GrandTotal = existingOrder.GrandTotal, Message = "Order recovered successfully.", PaymentStatus = existingOrder.PaymentStatus });
            }

            var cart = await _context.ShoppingCarts.Include(c => c.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product).FirstOrDefaultAsync(c => c.UserId == secureUserId);
            if (cart == null || !cart.Items.Any()) return BadRequest("Shopping cart is empty.");

            var now = DateTime.UtcNow;
            
            var activePromotions = await _context.Promotions
                .Include(p => p.PromotionProducts)
                .Include(p => p.PromotionCategories)
                .Include(p => p.PromotionTiers)
                .Where(p => p.Status == "ACTIVE" && p.StartDate <= now && p.EndDate >= now).ToListAsync();

            var activeTaxes = await _context.TaxRules
                .Include(t => t.TaxRuleProducts)
                .Include(t => t.TaxRuleCategories)
                .Where(t => t.IsActive && t.StartDate <= now && (t.EndDate == null || t.EndDate >= now)).ToListAsync();

            var activeCharges = await _context.ProductCharges.Where(pc => pc.IsActive).ToListAsync();

            var order = new Order
            {
                UserId = secureUserId, OrderDate = DateTime.UtcNow, DeliveryAddress = request.DeliveryAddress, DeliveryMethod = request.DeliveryMethod,
                OrderNumber = $"SM-{DateTime.UtcNow.Year}-{new Random().Next(100000, 999999)}", IdempotencyKey = request.IdempotencyKey,
                PaymentMethod = request.PaymentMethod, PaymentStatus = "PENDING", OrderStatus = request.PaymentMethod == "COD" ? "VALIDATING" : "PENDING"
            };

            decimal calculatedSubtotal = 0; 
            decimal calculatedDiscountAmount = 0;
            decimal calculatedTaxAmount = 0;
            var stripeLineItems = new List<SessionLineItemOptions>(); 
            var appliedPromosDict = new Dictionary<int, OrderPromotion>();

            foreach (var cartItem in cart.Items)
            {
                var variant = cartItem.Variant;
                if (variant == null || variant.Product == null || !variant.IsActive) return BadRequest($"Item {variant?.Product?.Name} is no longer available.");
                if (variant.StockQuantity < cartItem.Quantity) return BadRequest($"System sync error: Insufficient stock for {variant.Product.Name}.");

                decimal originalItemTotal = variant.Price * cartItem.Quantity;
                decimal itemDiscount = 0;
                Promotion? appliedPromo = null;

                foreach (var promo in activePromotions)
                {
                    bool isEligible = (!promo.PromotionProducts.Any() && !promo.PromotionCategories.Any() && string.IsNullOrEmpty(promo.TargetBrand)) || 
                                      promo.PromotionProducts.Any(pp => pp.ProductId == variant.Product.Id) || 
                                      promo.PromotionCategories.Any(pc => pc.CategoryId == variant.Product.CategoryId) || 
                                      (!string.IsNullOrEmpty(promo.TargetBrand) && string.Equals(promo.TargetBrand, variant.Product.Brand, StringComparison.OrdinalIgnoreCase));

                    if (isEligible)
                    {
                        decimal potentialDiscount = 0;
                        if (promo.Type == PromotionType.PERCENTAGE_DISCOUNT) potentialDiscount = originalItemTotal * (promo.DiscountValue / 100m);
                        else if (promo.Type == PromotionType.FIXED_AMOUNT_DISCOUNT) potentialDiscount = promo.DiscountValue * cartItem.Quantity;
                        else if (promo.Type == PromotionType.BUY_ONE_GET_ONE && cartItem.Quantity >= 2) potentialDiscount = (cartItem.Quantity / 2) * variant.Price;
                        else if (promo.Type == PromotionType.BUY_X_GET_Y && promo.BuyQuantityX.HasValue && promo.GetQuantityY.HasValue)
                        {
                            int sets = cartItem.Quantity / (promo.BuyQuantityX.Value + promo.GetQuantityY.Value);
                            potentialDiscount = sets * promo.GetQuantityY.Value * variant.Price;
                        }
                        
                        if (potentialDiscount > itemDiscount) { itemDiscount = potentialDiscount; appliedPromo = promo; }
                    }
                }

                if (itemDiscount > originalItemTotal) itemDiscount = originalItemTotal;
                decimal finalItemPrice = originalItemTotal - itemDiscount;

                calculatedSubtotal += originalItemTotal;
                calculatedDiscountAmount += itemDiscount;

                if (appliedPromo != null && itemDiscount > 0)
                {
                    if (!appliedPromosDict.ContainsKey(appliedPromo.Id))
                        appliedPromosDict[appliedPromo.Id] = new OrderPromotion { OrderId = order.Id, OriginalPromotionId = appliedPromo.Id, PromotionNameSnapshot = appliedPromo.Name, PromotionTypeSnapshot = appliedPromo.Type.ToString(), DiscountApplied = 0 };
                    appliedPromosDict[appliedPromo.Id].DiscountApplied += itemDiscount;
                }

                var applicableTaxes = activeTaxes.Where(t => (!t.TaxRuleProducts.Any() && !t.TaxRuleCategories.Any()) || t.TaxRuleProducts.Any(tp => tp.ProductId == variant.Product.Id) || t.TaxRuleCategories.Any(tc => tc.CategoryId == variant.Product.CategoryId)).ToList();

                decimal itemTax = 0;
                if (applicableTaxes.Any())
                {
                    foreach (var tax in applicableTaxes) itemTax += finalItemPrice * (tax.RatePercentage / 100m);
                }

                calculatedTaxAmount += itemTax;

                order.Items.Add(
                    new OrderItem
                    {
                        ProductVariantId = variant.Id,
                        ProductName = variant.Product.Name,
                        VariantName = variant.WeightOrSize,
                        Quantity = cartItem.Quantity,
                        OriginalUnitPrice = variant.Price,
                        PromotionDiscountAmount = itemDiscount,
                        TaxAmount = itemTax,
                        UnitPrice = finalItemPrice / cartItem.Quantity
                    });
            }
            
            var cartPromos = activePromotions.Where(p => p.Type == PromotionType.MINIMUM_SPEND_DISCOUNT || p.Type == PromotionType.TIERED_DISCOUNT).ToList();
            decimal rawSubtotal = calculatedSubtotal - calculatedDiscountAmount;

            foreach (var promo in cartPromos)
            {
                decimal cartDiscount = 0;
                if (promo.Type == PromotionType.MINIMUM_SPEND_DISCOUNT && promo.MinimumSpend.HasValue && rawSubtotal >= promo.MinimumSpend.Value)
                    cartDiscount = promo.DiscountValue;
                else if (promo.Type == PromotionType.TIERED_DISCOUNT && promo.PromotionTiers.Any())
                {
                    var highestTier = promo.PromotionTiers.Where(t => rawSubtotal >= t.MinimumSpendAmount).OrderByDescending(t => t.MinimumSpendAmount).FirstOrDefault();
                    if (highestTier != null) cartDiscount = rawSubtotal * (highestTier.DiscountValue / 100m);
                }

                if (cartDiscount > 0)
                {
                    cartDiscount = Math.Min(cartDiscount, rawSubtotal);
                    calculatedDiscountAmount += cartDiscount;
                    rawSubtotal -= cartDiscount;
                    appliedPromosDict[promo.Id] = new OrderPromotion { OrderId = order.Id, OriginalPromotionId = promo.Id, PromotionNameSnapshot = promo.Name, PromotionTypeSnapshot = promo.Type.ToString(), DiscountApplied = cartDiscount };
                }
            }

            order.AppliedPromotions = appliedPromosDict.Values.ToList();

            int actualPointsToRedeem = 0;
            decimal loyaltyDiscountAmount = 0;
            LoyaltyAccount? loyaltyAccountToUpdate = null;

            if (request.PointsToRedeem > 0)
            {
                loyaltyAccountToUpdate = await _context.LoyaltyAccounts.Include(l => l.CurrentTier).Include(l => l.PointLots.Where(p => p.RemainingPoints > 0 && !p.IsExpired).OrderBy(p => p.ExpiresAt)).FirstOrDefaultAsync(l => l.UserId == secureUserId);
                if (loyaltyAccountToUpdate != null && loyaltyAccountToUpdate.Status == "ACTIVE" && loyaltyAccountToUpdate.CurrentTier != null)
                {
                    actualPointsToRedeem = Math.Min(request.PointsToRedeem, loyaltyAccountToUpdate.CurrentPointsBalance);
                    actualPointsToRedeem = Math.Min(actualPointsToRedeem, loyaltyAccountToUpdate.CurrentTier.MaxRedeemablePointsPerOrder);
                    decimal maxAllowedDiscount = rawSubtotal * (loyaltyAccountToUpdate.CurrentTier.MaxDiscountPercentage / 100m);
                    if (actualPointsToRedeem > maxAllowedDiscount) actualPointsToRedeem = (int)Math.Floor(maxAllowedDiscount);
                    loyaltyDiscountAmount = actualPointsToRedeem; 
                }
            }

            decimal deliveryFee = 0;
            foreach (var charge in activeCharges)
            {
                bool isEligible = rawSubtotal >= charge.MinOrderAmount && (!charge.MaxOrderAmount.HasValue || rawSubtotal <= charge.MaxOrderAmount.Value);
                if (isEligible)
                {
                    if (charge.ChargeType == "FIXED") deliveryFee += charge.AmountOrPercentage;
                    else if (charge.ChargeType == "PERCENTAGE") deliveryFee += rawSubtotal * (charge.AmountOrPercentage / 100m);
                }
            }   
            order.DeliveryFee = deliveryFee;

            order.Subtotal = calculatedSubtotal; 
            order.DiscountAmount = calculatedDiscountAmount; 
            order.LoyaltyPointsUsed = actualPointsToRedeem;
            order.LoyaltyDiscountAmount = loyaltyDiscountAmount;
            order.TaxAmount = calculatedTaxAmount;
            
            order.GrandTotal = Math.Max(0, (rawSubtotal - loyaltyDiscountAmount) + calculatedTaxAmount + order.DeliveryFee);

            if (order.GrandTotal == 0)
            {
                order.PaymentStatus = "PAID";
                order.OrderStatus = "VALIDATING";
            }
            else if (order.GrandTotal > 0)
            {
                stripeLineItems.Add(new SessionLineItemOptions {
                    PriceData = new SessionLineItemPriceDataOptions { UnitAmount = (long)(order.GrandTotal * 100), Currency = "lkr", ProductData = new SessionLineItemPriceDataProductDataOptions { Name = $"Velocart Order (Including Taxes & Discounts)" } },
                    Quantity = 1
                });
            }

            foreach(var item in order.Items)
            {
                var variant = cart.Items.First(i => i.ProductVariantId == item.ProductVariantId).Variant;
                int originalQty = variant!.StockQuantity;
                variant.ReservedQuantity = Math.Max(0, variant.ReservedQuantity - item.Quantity);
                variant.StockQuantity -= item.Quantity; 

                _context.InventoryTransactions.Add(new InventoryTransaction {
                    ProductVariantId = variant.Id, Type = TransactionType.Sold, QuantityChanged = -item.Quantity, QuantityBefore = originalQty, QuantityAfter = variant.StockQuantity, ReferenceDocument = $"ORDER-{order.OrderNumber}", Reason = "E-Commerce Sale"
                });

                var batches = await _context.ProductBatches.Where(b => b.ProductVariantId == variant.Id && b.CurrentQuantity > 0).OrderBy(b => b.ExpiryDate).ToListAsync();
                int remainingToDeduct = item.Quantity;
                foreach (var batch in batches) { if (remainingToDeduct <= 0) break; int deductAmount = Math.Min(batch.CurrentQuantity, remainingToDeduct); batch.CurrentQuantity -= deductAmount; remainingToDeduct -= deductAmount; }
            }

            _context.Orders.Add(order);
            _context.ShoppingCartItems.RemoveRange(cart.Items);
            await _context.SaveChangesAsync();

            if (actualPointsToRedeem > 0 && loyaltyAccountToUpdate != null)
            {
                int balanceBefore = loyaltyAccountToUpdate.CurrentPointsBalance;
                loyaltyAccountToUpdate.CurrentPointsBalance -= actualPointsToRedeem;
                loyaltyAccountToUpdate.TotalPointsRedeemed += actualPointsToRedeem;

                int pointsLeftToDeduct = actualPointsToRedeem;
                foreach (var lot in loyaltyAccountToUpdate.PointLots) { if (pointsLeftToDeduct <= 0) break; int deduct = Math.Min(lot.RemainingPoints, pointsLeftToDeduct); lot.RemainingPoints -= deduct; pointsLeftToDeduct -= deduct; }

                _context.LoyaltyTransactions.Add(new LoyaltyTransaction { LoyaltyAccountId = loyaltyAccountToUpdate.Id, TransactionReference = $"LOY-RED-{DateTime.UtcNow:yyyyMMdd}-{order.OrderNumber}", TransactionType = "REDEEMED", SourceType = "ORDER", SourceId = order.Id, Points = -actualPointsToRedeem, BalanceBefore = balanceBefore, BalanceAfter = loyaltyAccountToUpdate.CurrentPointsBalance, Reason = $"Points redeemed for Order {order.OrderNumber}" });
                _context.Notifications.Add(new Notification { UserId = secureUserId, Title = "Points Redeemed", Message = $"You successfully used {actualPointsToRedeem} points to save Rs. {loyaltyDiscountAmount} on Order {order.OrderNumber}.", Type = "LOYALTY" });
                await _context.SaveChangesAsync();
            }

            var user = await _context.Users.FindAsync(secureUserId);
            if (user != null) 
            {
                await SendOrderInvoiceEmail(order, user.Email, user.FullName);
            }

            string stripeUrl = string.Empty;
            
            if (request.PaymentMethod == "CARD" && order.GrandTotal > 0)
            {
                var options = new SessionCreateOptions { PaymentMethodTypes = new List<string> { "card" }, LineItems = stripeLineItems, Mode = "payment", SuccessUrl = "http://localhost:5173/orders?payment=success", CancelUrl = "http://localhost:5173/catalog?payment=cancelled", Metadata = new Dictionary<string, string> { { "OrderNumber", order.OrderNumber } } };
                var service = new SessionService();
                var session = await service.CreateAsync(options);
                stripeUrl = session.Url;
            }
            else if (request.PaymentMethod == "COD" || order.GrandTotal == 0)
            {
                await ProcessLoyaltyEarningAsync(order, secureUserId);
            }

            return Ok(new CheckoutResponseDto { OrderNumber = order.OrderNumber,Subtotal = order.Subtotal, TaxAmount = order.TaxAmount, DeliveryFee = order.DeliveryFee, DiscountAmount = order.DiscountAmount, LoyaltyDiscountApplied = loyaltyDiscountAmount, GrandTotal = order.GrandTotal, PaymentStatus = order.PaymentStatus, StripeUrl = stripeUrl, PointsRedeemed = actualPointsToRedeem, Message = request.PaymentMethod == "CARD" && order.GrandTotal > 0 ? "Redirecting to secure gateway..." : "Order placed successfully!" });
        }

        [AllowAnonymous] 
        [HttpPost("webhook")]
        public async Task<IActionResult> StripeWebhook()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            try
            {
                var stripeEvent = EventUtility.ConstructEvent(json, Request.Headers["Stripe-Signature"], _configuration["Stripe:WebhookSecret"]);
                if (stripeEvent.Type == "checkout.session.completed")
                {
                    var session = stripeEvent.Data.Object as Session;
                    if (session != null && session.Metadata.ContainsKey("OrderNumber"))
                    {
                        var orderNumber = session.Metadata["OrderNumber"];
                        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
                        
                        if (order != null)
                        {
                            order.PaymentStatus = "PAID"; order.OrderStatus = "VALIDATING"; await _context.SaveChangesAsync();
                            await ProcessLoyaltyEarningAsync(order, order.UserId);
                            var user = await _context.Users.FindAsync(order.UserId);
                            if (user != null) await SendOrderInvoiceEmail(order, user.Email, user.FullName);
                        }
                    }
                }
                return Ok();
            }
            catch (Exception) { return BadRequest(); }
        }

        [HttpGet("history")]
        public async Task<ActionResult> GetMyOrders()
        {
            int secureUserId = GetSecureUserId();
            var orders = await _context.Orders.Include(o => o.Items).ThenInclude(i => i.Variant).Include(o => o.Complaints).Where(o => o.UserId == secureUserId).OrderByDescending(o => o.OrderDate)
                .Select(o => new { 
                    o.Id, o.OrderNumber, o.OrderDate, o.DeliveryAddress, o.DeliveryMethod, 
                    o.Subtotal, o.DiscountAmount, o.LoyaltyPointsUsed, o.LoyaltyDiscountAmount, 
                    o.TaxAmount, o.DeliveryFee, o.GrandTotal, o.OrderStatus, o.PaymentStatus, o.PaymentMethod, o.IsCustomerConfirmed, 
                    Items = o.Items.Select(i => new { i.Id, i.ProductVariantId, ProductId = i.Variant != null ? i.Variant.ProductId : 0, i.ProductName, i.VariantName, i.Quantity, i.UnitPrice }), 
                    Complaints = o.Complaints.Select(c => new { c.Id, c.Subject, c.Description, c.Status, c.RefundStatus, c.RefundAmount, c.RefundMethod, c.ResolutionNotes })
                })
                .ToListAsync();

            return Ok(orders);
        }

        [HttpPost("{orderId}/reorder")]
        public async Task<ActionResult> Reorder(int orderId)
        {
            int secureUserId = GetSecureUserId();
            var oldOrder = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == secureUserId);
            if (oldOrder == null) return NotFound("Order not found.");

            var cart = await _context.ShoppingCarts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == secureUserId);
            if (cart == null) { cart = new ShoppingCart { UserId = secureUserId }; _context.ShoppingCarts.Add(cart); await _context.SaveChangesAsync(); }

            int itemsAdded = 0; int itemsSkipped = 0;
            foreach (var oldItem in oldOrder.Items)
            {
                var variant = await _context.ProductVariants.Include(v => v.Product).FirstOrDefaultAsync(v => v.Id == oldItem.ProductVariantId);
                if (variant == null || !variant.IsActive || variant.Product == null || !variant.Product.IsActive) { itemsSkipped++; continue; }

                int availableStock = variant.StockQuantity - variant.ReservedQuantity;
                if (availableStock <= 0) { itemsSkipped++; continue; }

                int safeQuantity = Math.Min(oldItem.Quantity, availableStock);
                var existingCartItem = cart.Items.FirstOrDefault(i => i.ProductVariantId == variant.Id);

                if (existingCartItem != null) existingCartItem.Quantity += safeQuantity;
                else cart.Items.Add(new ShoppingCartItem { ShoppingCartId = cart.Id, ProductVariantId = variant.Id, Quantity = safeQuantity });

                variant.ReservedQuantity += safeQuantity; 
                itemsAdded++;
            }
            if (itemsAdded == 0) return BadRequest("None of the items in this order are currently available.");
            cart.LastUpdated = DateTime.UtcNow; await _context.SaveChangesAsync();
            return Ok(new { message = itemsSkipped > 0 ? $"Added {itemsAdded} items to cart. ({itemsSkipped} unavailable)." : "All items added to cart successfully!" });
        }

        [HttpPut("{orderId}/cancel")]
        public async Task<ActionResult> CancelOrder(int orderId)
        {
            int secureUserId = GetSecureUserId();
            var order = await _context.Orders.Include(o => o.Items).Include(o => o.User).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == secureUserId);
            if (order == null) return NotFound("Order not found.");

            if (order.OrderStatus != "PENDING" && order.OrderStatus != "VALIDATING") 
                return BadRequest("Orders that have been Confirmed or Distributed cannot be cancelled.");

            // 2. ADDED: Check if this was a Card payment that requires a refund
            bool requiresRefund = (order.PaymentMethod == "CARD" && order.GrandTotal > 0);
            
            order.OrderStatus = "CANCELLED";

            // 3. ADDED: Automatically push to REFUND_PENDING instead of CANCELLED so admins know to refund it
            order.PaymentStatus = requiresRefund ? "REFUND_PENDING" : "CANCELLED";

            foreach (var item in order.Items)
            {
                var variant = await _context.ProductVariants.FindAsync(item.ProductVariantId);
                if (variant != null) 
                {
                    int originalQty = variant.StockQuantity;
                    variant.StockQuantity += item.Quantity; 

                    _context.InventoryTransactions.Add(new InventoryTransaction {
                        ProductVariantId = variant.Id, Type = TransactionType.Returned,
                        QuantityChanged = item.Quantity, QuantityBefore = originalQty, QuantityAfter = variant.StockQuantity,
                        ReferenceDocument = $"ORDER-{order.OrderNumber}", Reason = "Customer Cancellation"
                    });
                }
            }

            await ProcessLoyaltyReversalAsync(order, secureUserId);

            await _context.SaveChangesAsync();
            // 4. ADDED: Dynamic message and Email firing
            string returnMessage = "Order cancelled successfully. Stock has been restored.";

            if (requiresRefund && order.User != null)
            {
                returnMessage = "Order cancelled successfully. The refund process takes 2 to 3 days. Contact Technical Support for assistance.";
                
                // Using your existing beautifully formatted HTML email structure
                var emailBody = $@"
                <div style='font-family:Arial;'>
                    <div style='background:#050505;color:#D4AF37;padding:20px;text-align:center;'>
                        <h2>Refund Initiated</h2>
                    </div>
                    <div style='padding:20px;'>
                        <p>Hi {order.User.FullName},</p>
                        <p>Your order <strong>{order.OrderNumber}</strong> has been cancelled successfully.</p>
                        <p>Please note that the refund process takes <strong>2 to 3 business days</strong> to reflect on your card.</p>
                        <p>If you have any issues, please contact Technical Support:</p>
                        <p>Phone: +94 33 999 9999<br/>Email: support@velocart.com</p>
                        <br/>
                        <p>Thank you for shopping with VeloCart.</p>
                    </div>
                </div>";

                try 
                {
                    // Triggering your existing Email Service!
                    await _emailService.SendEmailAsync(order.User.Email, $"Refund Initiated: Order {order.OrderNumber}", emailBody);
                }
                    catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send refund notification email to {order.User.Email}: {ex.Message}");
                }
            }

            return Ok(new { message = returnMessage });
        }

        [HttpGet("delivery-management/orders")]
        [Authorize(Roles = "DELIVERYMANAGER")] 
        public async Task<ActionResult> GetAllActiveOrdersForDM()
        {
            var orders = await _context.Orders
                .Include(o => o.User)
                .Include(o => o.DeliveryDetail)
                .Include(o => o.Complaints)
                .Where(o => o.OrderStatus != "CANCELLED" && !o.IsCustomerConfirmed)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new {
                    o.Id, o.OrderNumber, o.OrderDate, o.OrderStatus, o.PaymentStatus, o.PaymentMethod,
                    CustomerName = o.User!.FullName, CustomerEmail = o.User.Email, o.DeliveryAddress, o.GrandTotal,
                    DeliveryDetail = o.DeliveryDetail,
                    HasOpenComplaints = o.Complaints.Any(c => c.Status != "RESOLVED"),
                    Complaints = o.Complaints.Where(c => c.Status != "RESOLVED").Select(c => new { 
                        c.Id, c.Subject, c.Description, c.CreatedAt, c.Status, c.RefundStatus, c.RefundAmount, c.RefundMethod,
                        c.ImageUrl // <--- THE FIX: Send the image URL to the frontend!
                    }).ToList()
                }).ToListAsync();

            return Ok(orders);
        }

        [HttpPut("delivery-management/complaints/{complaintId}/resolve")]
        [Authorize(Roles = "DELIVERYMANAGER")]
        public async Task<ActionResult> ResolveComplaint(int complaintId)
        {
            var complaint = await _context.DeliveryComplaints.FindAsync(complaintId);
            if (complaint == null) return NotFound("Complaint not found.");

            complaint.Status = "RESOLVED";
            complaint.ResolvedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Complaint marked as resolved." });
        }

        [HttpPut("delivery-management/{orderId}/status")]
        [Authorize(Roles = "DELIVERYMANAGER")]
        public async Task<ActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusDto request)
        {
            var order = await _context.Orders.Include(o => o.User).FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return NotFound("Order not found.");

            order.OrderStatus = request.Status;
            await _context.SaveChangesAsync();

            if (request.Status == "DELIVERED" && order.User != null)
            {
                await SendOrderDeliveredEmail(order, order.User.Email, order.User.FullName);
            }

            return Ok(new { message = $"Order status successfully updated to {request.Status}." });
        }

        [HttpPut("delivery-management/{orderId}/delivery-details")]
        [Authorize(Roles = "DELIVERYMANAGER")]
        public async Task<ActionResult> UpdateDeliveryDetails(int orderId, [FromBody] UpdateDeliveryDetailsDto request)
        {
            var order = await _context.Orders.Include(o => o.DeliveryDetail).FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return NotFound("Order not found.");

            if (order.DeliveryDetail == null)
            {
                order.DeliveryDetail = new DeliveryDetail { OrderId = order.Id };
                _context.DeliveryDetails.Add(order.DeliveryDetail);
            }

            order.DeliveryDetail.DeliveryNumber = request.DeliveryNumber;
            order.DeliveryDetail.EstimatedDeliveryDate = request.EstimatedDeliveryDate.HasValue 
                ? DateTime.SpecifyKind(request.EstimatedDeliveryDate.Value, DateTimeKind.Utc) 
                : null;
            order.DeliveryDetail.EstimatedDeliveryTime = request.EstimatedDeliveryTime;
            order.DeliveryDetail.AssignedDriverName = request.AssignedDriverName;
            order.DeliveryDetail.AssignedDriverContact = request.AssignedDriverContact;
            order.DeliveryDetail.DeliveryNotes = request.DeliveryNotes;
            order.DeliveryDetail.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Delivery details updated successfully." });
        }

        [HttpGet("{orderId}/delivery-details")]
        public async Task<ActionResult> GetCustomerDeliveryDetails(int orderId)
        {
            int secureUserId = GetSecureUserId();
            var order = await _context.Orders.Include(o => o.DeliveryDetail).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == secureUserId);

            if (order == null) return NotFound("Order not found.");
            if (order.DeliveryDetail == null) return Ok(new { message = "Delivery details have not been assigned yet." });

            return Ok(order.DeliveryDetail);
        }

        [HttpPost("{orderId}/confirm-receipt")]
        public async Task<ActionResult> ConfirmReceipt(int orderId)
        {
            int secureUserId = GetSecureUserId();
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == secureUserId);

            if (order == null) return NotFound("Order not found.");
            if (order.OrderStatus != "DELIVERED") return BadRequest("You can only confirm receipt for orders marked as Delivered.");

            order.IsCustomerConfirmed = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Thank you for confirming your delivery!" });
        }

        [HttpPost("{orderId}/complaints")]
        public async Task<ActionResult> SubmitComplaint(int orderId, [FromForm] string subject, [FromForm] string description, [FromForm] IFormFile? image)
        {
            int secureUserId = GetSecureUserId();
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == secureUserId);

            if (order == null) return NotFound("Order not found.");

            string? uploadedImageUrl = null;
            if (image != null)
            {
                try {
                    uploadedImageUrl = await _imageService.UploadImageAsync(image);
                } catch (Exception ex) {
                    return BadRequest(new { message = $"Image upload failed: {ex.Message}" });
                }
            }

            var complaint = new DeliveryComplaint
            {
                OrderId = orderId,
                CustomerId = secureUserId,
                Subject = subject,
                Description = description,
                ImageUrl = uploadedImageUrl,
                Status = "OPEN",
                CreatedAt = DateTime.UtcNow
            };

            _context.DeliveryComplaints.Add(complaint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Your complaint has been submitted. Our AI Adjudicator will review it shortly." });
        }

        // =========================================================================
        // NEW REFUND LIFECYCLE ENDPOINTS
        // =========================================================================

        [HttpPut("complaints/{complaintId}/choose-refund")]
        public async Task<ActionResult> ChooseRefundMethod(int complaintId, [FromBody] ChooseRefundMethodDto request)
        {
            int secureUserId = GetSecureUserId();
            var complaint = await _context.DeliveryComplaints
                .Include(c => c.Order)
                .FirstOrDefaultAsync(c => c.Id == complaintId && c.CustomerId == secureUserId);

            if (complaint == null) return NotFound("Complaint not found.");
            if (complaint.Status != "RESOLUTION_OFFERED" || complaint.RefundStatus != "Pending_Customer_Choice")
                return BadRequest("This complaint is not pending a refund choice.");

            complaint.RefundMethod = request.RefundMethod;

            if (request.RefundMethod == "LoyaltyPoints")
            {
                // Process instant conversion to points! 
                // We give them a +10% bonus for keeping the money in the ecosystem
                var loyalty = await _context.LoyaltyAccounts.Include(l => l.CurrentTier).FirstOrDefaultAsync(l => l.UserId == secureUserId);
                if (loyalty != null && loyalty.CurrentTier != null)
                {
                    // Calculate points (Refund Amount * 1.10) / CurrencyAmountPerPoint
                    decimal bonusRefund = complaint.RefundAmount * 1.10m;
                    int pointsToGrant = (int)Math.Floor(bonusRefund / loyalty.CurrentTier.CurrencyAmountPerPoint);
                    
                    int balanceBefore = loyalty.CurrentPointsBalance;
                    loyalty.CurrentPointsBalance += pointsToGrant;
                    loyalty.TotalPointsEarned += pointsToGrant;

                    _context.LoyaltyTransactions.Add(new LoyaltyTransaction {
                        LoyaltyAccountId = loyalty.Id,
                        TransactionReference = $"LOY-REF-{DateTime.UtcNow:yyyyMMdd}-{complaint.Id}",
                        TransactionType = "EARNED",
                        SourceType = "SYSTEM",
                        SourceId = complaint.Id,
                        Points = pointsToGrant,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = loyalty.CurrentPointsBalance,
                        Reason = $"Refund converted to points (+10% Bonus) for Complaint #{complaint.Id}"
                    });

                    complaint.Status = "RESOLVED";
                    complaint.RefundStatus = "Completed";
                    complaint.RefundReceiptNumber = $"REF-PTS-{DateTime.UtcNow.Year}-{new Random().Next(10000,99999)}";
                    complaint.RefundProcessedAt = DateTime.UtcNow;
                    complaint.ResolvedAt = DateTime.UtcNow;
                }
                else
                {
                    return BadRequest("Loyalty account not found. Cannot convert to points.");
                }
            }
            else if (request.RefundMethod == "OriginalPayment")
            {
                complaint.RefundStatus = "Processing";
                // Stays in RESOLUTION_OFFERED so the Admin can see it requires processing
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Refund method set to {request.RefundMethod}. {(request.RefundMethod == "LoyaltyPoints" ? "Points credited instantly!" : "Our team is processing the refund to your card.")}" });
        }

        [HttpPut("delivery-management/complaints/{complaintId}/process-refund")]
        [Authorize(Roles = "DELIVERYMANAGER,ADMIN")]
        public async Task<ActionResult> ProcessRefund(int complaintId)
        {
            var complaint = await _context.DeliveryComplaints
                .Include(c => c.Customer)
                .Include(c => c.Order)
                .FirstOrDefaultAsync(c => c.Id == complaintId);

            if (complaint == null) return NotFound("Complaint not found.");
            if (complaint.RefundStatus != "Processing") return BadRequest("Complaint is not pending manual refund processing.");

            complaint.Status = "RESOLVED";
            complaint.RefundStatus = "Completed";
            complaint.RefundReceiptNumber = $"REF-CARD-{DateTime.UtcNow.Year}-{new Random().Next(10000,99999)}";
            complaint.RefundProcessedAt = DateTime.UtcNow;
            complaint.ResolvedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (complaint.Customer != null)
            {
                var emailBody = $@"
                <div style='font-family:Arial;'>
                    <div style='background:#050505;color:#D4AF37;padding:20px;text-align:center;'>
                        <h2>Refund Processed Successfully</h2>
                    </div>
                    <div style='padding:20px;'>
                        <p>Hi {complaint.Customer.FullName},</p>
                        <p>We have successfully processed your refund of <strong>Rs. {complaint.RefundAmount.ToString("F2")}</strong> to your original payment method.</p>
                        <p><strong>Receipt Number:</strong> {complaint.RefundReceiptNumber}</p>
                        <p><strong>Notes:</strong> {complaint.ResolutionNotes}</p>
                        <br/>
                        <p>Please allow 3-5 business days for the funds to appear on your statement.</p>
                    </div>
                </div>";
                await _emailService.SendEmailAsync(complaint.Customer.Email, $"Refund Receipt: {complaint.RefundReceiptNumber}", emailBody);
            }

            return Ok(new { message = "Refund processed and customer notified." });
        }
        // =========================================================================

        [HttpGet("{orderId}/invoice")]
        [AllowAnonymous] 
        public async Task<ActionResult> GetInvoiceData(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.User)
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return NotFound("Order not found.");

            var invoiceData = new {
                OrderNumber = order.OrderNumber,
                OrderDate = order.OrderDate,
                OrderStatus = order.OrderStatus,
                PaymentMethod = order.PaymentMethod,
                PaymentStatus = order.PaymentStatus,
                CustomerName = order.User?.FullName ?? "Guest",
                CustomerEmail = order.User?.Email ?? "N/A",
                CustomerAddress = order.DeliveryAddress,
                Subtotal = order.Subtotal,
                DiscountAmount = order.DiscountAmount,
                LoyaltyPointsUsed = order.LoyaltyPointsUsed,
                LoyaltyDiscountAmount = order.LoyaltyDiscountAmount,
                TaxAmount = order.TaxAmount,
                DeliveryFee = order.DeliveryFee,
                GrandTotal = order.GrandTotal,
                Items = order.Items.Select(i => new {
                    ProductName = i.ProductName,
                    VariantName = i.VariantName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Total = i.ItemTotal
                })
            };

            return Ok(invoiceData);
        }

        private async Task SendOrderInvoiceEmail(Order order, string userEmail, string userName)
        {
            string itemsHtml = "";
            foreach (var item in order.Items) itemsHtml += $"<tr><td style='padding:10px;border-bottom:1px solid #eee;'>{item.ProductName}</td><td style='text-align:center;'>{item.Quantity}</td><td style='text-align:right;'>Rs. {item.ItemTotal.ToString("F2")}</td></tr>";

            if (order.LoyaltyDiscountAmount > 0)
            {
                itemsHtml += $"<tr><td style='padding:10px;border-bottom:1px solid #eee;'><strong>Loyalty Points Redeemed ({order.LoyaltyPointsUsed})</strong></td><td style='text-align:center;'></td><td style='text-align:right; color:green;'>-Rs. {order.LoyaltyDiscountAmount.ToString("F2")}</td></tr>";
            }

            var emailBody = $"<div style='font-family:Arial;'><div style='background:#050505;color:#D4AF37;padding:20px;text-align:center;'><h2>Velocart Receipt</h2></div><div style='padding:20px;'><p>Hi {userName}, your order {order.OrderNumber} is confirmed.</p><table style='width:100%;'><tbody>{itemsHtml}</tbody></table><h3 style='text-align:right;'>Total: Rs. {order.GrandTotal.ToString("F2")}</h3></div></div>";
            await _emailService.SendEmailAsync(userEmail, $"Velocart Order {order.OrderNumber} Receipt", emailBody);
        }

        private async Task SendOrderDeliveredEmail(Order order, string userEmail, string userName)
        {
            var emailBody = $@"
            <div style='font-family:Arial;'>
                <div style='background:#050505;color:#D4AF37;padding:20px;text-align:center;'>
                    <h2>Your Order Has Been Delivered!</h2>
                </div>
                <div style='padding:20px;'>
                    <p>Hi {userName},</p>
                    <p>Good news! Your order <strong>{order.OrderNumber}</strong> has been marked as delivered.</p>
                    <p>Please log in to your Velocart account to <strong>Confirm Receipt</strong> or report a problem if you have not received your items.</p>
                    <br/>
                    <a href='http://localhost:5173/orders' style='background:#D4AF37; color:black; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:5px;'>View My Orders</a>
                </div>
            </div>";

            await _emailService.SendEmailAsync(userEmail, $"Order Delivered: {order.OrderNumber}", emailBody);
        }

        private async Task ProcessLoyaltyEarningAsync(Order order, int userId)
        {
            var alreadyEarned = await _context.LoyaltyTransactions.AnyAsync(
                t => t.SourceId == order.Id &&
                     t.SourceType == "ORDER" &&
                     t.TransactionType == "EARNED");

            if (alreadyEarned)
            {
                return;
            }

            var loyaltyAccount = await _context.LoyaltyAccounts
                .Include(l => l.CurrentTier)
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (loyaltyAccount == null || loyaltyAccount.CurrentTier == null || loyaltyAccount.Status != "ACTIVE") return;

            decimal eligibleAmount = order.Subtotal - order.DiscountAmount;
            if (eligibleAmount <= 0) return;

            int pointsEarned = (int)Math.Floor(eligibleAmount / loyaltyAccount.CurrentTier.CurrencyAmountPerPoint);
            if (pointsEarned <= 0) return;

            int balanceBefore = loyaltyAccount.CurrentPointsBalance;
            loyaltyAccount.CurrentPointsBalance += pointsEarned;
            loyaltyAccount.TotalPointsEarned += pointsEarned;
            loyaltyAccount.TotalEligibleSpend += eligibleAmount;

            var transaction = new LoyaltyTransaction
            {
                LoyaltyAccountId = loyaltyAccount.Id,
                TransactionReference = $"LOY-EARN-{DateTime.UtcNow:yyyyMMdd}-{order.OrderNumber}",
                TransactionType = "EARNED",
                SourceType = "ORDER",
                SourceId = order.Id,
                Points = pointsEarned,
                BalanceBefore = balanceBefore,
                BalanceAfter = loyaltyAccount.CurrentPointsBalance,
                Reason = $"Points earned from Order {order.OrderNumber}"
            };
            _context.LoyaltyTransactions.Add(transaction);

            var pointLot = new LoyaltyPointLot
            {
                LoyaltyAccountId = loyaltyAccount.Id,
                SourceTransaction = transaction,
                OriginalPoints = pointsEarned,
                RemainingPoints = pointsEarned,
                ExpiresAt = DateTime.UtcNow.AddDays(loyaltyAccount.CurrentTier.PointExpiryDays)
            };
            _context.LoyaltyPointLots.Add(pointLot);

            _context.Notifications.Add(new Notification { UserId = userId, Title = "Points Earned!", Message = $"You just earned {pointsEarned} VelocityFamily points from your recent purchase.", Type = "LOYALTY" });

            var allTiers = await _context.LoyaltyRules.OrderByDescending(r => r.MinimumPoints).ToListAsync();
            var applicableTier = allTiers.FirstOrDefault(r => loyaltyAccount.TotalPointsEarned >= r.MinimumPoints);

            if (applicableTier != null && applicableTier.Id != loyaltyAccount.CurrentTierRuleId)
            {
                var tierHistory = new LoyaltyTierHistory
                {
                    LoyaltyAccountId = loyaltyAccount.Id,
                    PreviousTierName = loyaltyAccount.CurrentTier.TierName,
                    NewTierName = applicableTier.TierName,
                    Reason = "Automated Upgrade based on Total Points Earned"
                };
                _context.LoyaltyTierHistories.Add(tierHistory);
                loyaltyAccount.CurrentTierRuleId = applicableTier.Id;

                _context.Notifications.Add(new Notification { UserId = userId, Title = "Tier Upgraded! 🎉", Message = $"Congratulations! You have been upgraded to the {applicableTier.TierName} tier.", Type = "LOYALTY" });
            }

            await _context.SaveChangesAsync();
        }

        private async Task ProcessLoyaltyReversalAsync(Order order, int userId)
        {
            var loyaltyAccount = await _context.LoyaltyAccounts.Include(l => l.CurrentTier).FirstOrDefaultAsync(l => l.UserId == userId);
            if (loyaltyAccount == null) return;

            // ==========================================
            // 1. REVERSE POINTS EARNED FROM THIS ORDER
            // ==========================================
        var earnedTx = await _context.LoyaltyTransactions.FirstOrDefaultAsync(t => t.SourceId == order.Id && t.SourceType == "ORDER" && t.TransactionType == "EARNED");
        if (earnedTx != null)
        {
            var  alreadyReversed = await _context.LoyaltyTransactions.AnyAsync(t => t.ReversesTransactionId == earnedTx.Id&&
                t.TransactionType == "REVERSED");
            if (!alreadyReversed)
            {
                int pointsToReverse = earnedTx.Points;
                int balanceBefore = loyaltyAccount.CurrentPointsBalance;
                int pointsActuallyRemoved = Math.Min(
                loyaltyAccount.CurrentPointsBalance, pointsToReverse);

                loyaltyAccount.CurrentPointsBalance -= pointsActuallyRemoved;
                loyaltyAccount.TotalPointsEarned = Math.Max(0, loyaltyAccount.TotalPointsEarned - pointsToReverse);

                decimal eligibleSpendToReverse = order.Subtotal - order.DiscountAmount;

                loyaltyAccount.TotalEligibleSpend = Math.Max(0, loyaltyAccount.TotalEligibleSpend - eligibleSpendToReverse);

                _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                {
                    LoyaltyAccountId = loyaltyAccount.Id,
                    TransactionReference = $"LOY-REV-EARN-{DateTime.UtcNow:yyyyMMdd}-{order.OrderNumber}",
                    TransactionType = "REVERSED",
                    SourceType = "ORDER",
                    SourceId = order.Id,
                    Points = -pointsActuallyRemoved,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = loyaltyAccount.CurrentPointsBalance,
                    Reason = $"Earned points reversed due to Order {order.OrderNumber} cancellation",
                    ReversesTransactionId = earnedTx.Id
                });

                var pointLot = await _context.LoyaltyPointLots.FirstOrDefaultAsync(p => p.SourceTransactionId == earnedTx.Id);
                if (pointLot != null)
                {
                    pointLot.RemainingPoints = 0;
                    pointLot.IsExpired = true; 
                }
            }
        }

        // ==========================================
        // 2. REFUND POINTS SPENT ON THIS ORDER
        // ==========================================
        if (order.LoyaltyPointsUsed > 0)
        {
            var  alreadyRefunded = await _context.LoyaltyTransactions.AnyAsync(t => t.SourceId == order.Id && t.SourceType == "ORDER" && t.TransactionType == "REFUNDED");
            if (!alreadyRefunded)
            {
                int balanceBefore = loyaltyAccount.CurrentPointsBalance;
            
                // Give the points back to their active balance
                loyaltyAccount.CurrentPointsBalance += order.LoyaltyPointsUsed;

                _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                {
                    LoyaltyAccountId = loyaltyAccount.Id,
                    TransactionReference = $"LOY-REF-SPENT-{DateTime.UtcNow:yyyyMMdd}-{order.OrderNumber}",
                    TransactionType = "REFUNDED",
                    SourceType = "ORDER",
                    SourceId = order.Id,
                    Points = order.LoyaltyPointsUsed, // Positive number adding back to account
                    BalanceBefore = balanceBefore,
                    BalanceAfter = loyaltyAccount.CurrentPointsBalance,
                    Reason = $"Spent points refunded due to Order {order.OrderNumber} cancellation"
                });
            }
        }

        var allTiers = await _context.LoyaltyRules
                .OrderByDescending(t => t.MinimumPoints)
                .ToListAsync();

        var applicableTier = allTiers.FirstOrDefault(t => loyaltyAccount.TotalPointsEarned >= t.MinimumPoints);

        if (applicableTier != null && loyaltyAccount.CurrentTierRuleId != applicableTier.Id && loyaltyAccount.CurrentTier != null)
        {

            _context.LoyaltyTierHistories.Add(new LoyaltyTierHistory
            {
                LoyaltyAccountId = loyaltyAccount.Id,
                PreviousTierName = loyaltyAccount.CurrentTier.TierName,
                NewTierName = applicableTier.TierName,
                Reason =
                    $"Tier recalculated after cancellation of Order {order.OrderNumber}"
            });
        }

        await _context.SaveChangesAsync();
    }

        // =========================================================================
        // UPDATED: Execute AI Adjudicated Resolutions (Triggers the new lifecycle)
        // =========================================================================
        [HttpPost("resolve-complaints")]
        [Authorize(Roles = "DELIVERYMANAGER,ADMIN")]
        public async Task<ActionResult> ExecuteResolutions([FromBody] List<AIResolutionDto> resolutions)
        {
            foreach(var res in resolutions)
            {
                var complaint = await _context.DeliveryComplaints.FindAsync(res.ComplaintId);
                if (complaint != null && complaint.Status == "OPEN")
                {
                    complaint.RefundAmount = res.RefundAmount;
                    complaint.CompensatoryPoints = res.CompensatoryPoints;
                    complaint.ResolutionNotes = res.ResolutionNotes;
                    
                    // NEW BUSINESS LOGIC
                    if (res.RefundAmount > 0)
                    {
                        complaint.Status = "RESOLUTION_OFFERED";
                        complaint.RefundStatus = "Pending_Customer_Choice";
                    }
                    else
                    {
                        // No money involved, safe to auto-resolve
                        complaint.Status = "RESOLVED";
                        complaint.ResolvedAt = DateTime.UtcNow;
                    }

                    // Grant compensatory points immediately (Apology points)
                    if (res.CompensatoryPoints > 0)
                    {
                        var loyalty = await _context.LoyaltyAccounts.FirstOrDefaultAsync(l => l.UserId == complaint.CustomerId);
                        if (loyalty != null)
                        {
                            int balanceBefore = loyalty.CurrentPointsBalance;
                            loyalty.CurrentPointsBalance += res.CompensatoryPoints;
                            loyalty.TotalPointsEarned += res.CompensatoryPoints;

                            _context.LoyaltyTransactions.Add(new LoyaltyTransaction {
                                LoyaltyAccountId = loyalty.Id,
                                TransactionReference = $"LOY-COMP-{DateTime.UtcNow:yyyyMMdd}-{complaint.Id}",
                                TransactionType = "EARNED",
                                SourceType = "SYSTEM",
                                SourceId = complaint.Id,
                                Points = res.CompensatoryPoints,
                                BalanceBefore = balanceBefore,
                                BalanceAfter = loyalty.CurrentPointsBalance,
                                Reason = "Compensatory points awarded for complaint resolution."
                            });
                        }
                    }
                    
                    // Notify the user an action or resolution occurred
                    _context.Notifications.Add(new Notification { 
                        UserId = complaint.CustomerId, 
                        Title = res.RefundAmount > 0 ? "Refund Action Required" : "Complaint Resolved", 
                        Message = res.RefundAmount > 0 ? $"Our AI Adjudicator has offered a refund for Complaint #{complaint.Id}. Please log in to choose your refund method." : $"Your complaint #{complaint.Id} has been resolved.", 
                        Type = "ORDER" 
                    });
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "All selected complaints processed successfully." });
        }

        // =========================================================================
        // NEW: REAL-TIME MAP TRACKING ENDPOINTS
        // =========================================================================

        [HttpPost("delivery-management/{orderId}/location")]
        [Authorize(Roles = "DELIVERYMANAGER")]
        public async Task<ActionResult> AddOrderLocation(int orderId, [FromBody] AddOrderLocationDto request)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null) return NotFound("Order not found.");

            var location = new OrderLocation
            {
                OrderId = orderId,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                PlaceName = request.PlaceName,
                Timestamp = DateTime.UtcNow
            };

            _context.OrderLocations.Add(location);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Live location updated on the map.", location });
        }

        [HttpGet("{orderId}/locations")]
        [Authorize] // Both Customers and Delivery Managers can see this
        public async Task<ActionResult> GetOrderLocations(int orderId)
        {
            int secureUserId = GetSecureUserId();
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Security: If they are a customer, ensure they only query their OWN order
            var orderQuery = _context.Orders.Where(o => o.Id == orderId);
            if (userRole == "CUSTOMER")
            {
                orderQuery = orderQuery.Where(o => o.UserId == secureUserId);
            }

            var order = await orderQuery.FirstOrDefaultAsync();
            if (order == null) return NotFound("Order not found or access denied.");

            var locations = await _context.OrderLocations
                .Where(l => l.OrderId == orderId)
                .OrderByDescending(l => l.Timestamp)
                .ToListAsync();

            return Ok(locations);
        }
    }
}