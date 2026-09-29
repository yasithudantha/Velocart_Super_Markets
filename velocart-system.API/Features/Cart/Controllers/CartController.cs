using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Cart.Models;
using velocart_system.API.Features.Cart.DTOs;

namespace velocart_system.API.Features.Cart.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CartController(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new UnauthorizedAccessException("Invalid token claims.");
        }

        [HttpPost("add")]
        public async Task<ActionResult> AddToCart([FromBody] AddToCartDto request)
        {
            int secureUserId = GetSecureUserId();
            if (request.Quantity <= 0) return BadRequest("Quantity must be greater than zero.");

            var variant = await _context.ProductVariants.Include(v => v.Product).FirstOrDefaultAsync(v => v.Id == request.ProductVariantId);
            if (variant == null || !variant.IsActive || (variant.Product != null && !variant.Product.IsActive)) 
                return BadRequest("This product is no longer available.");

            var cart = await _context.ShoppingCarts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == secureUserId);
            if (cart == null)
            {
                cart = new ShoppingCart { UserId = secureUserId };
                _context.ShoppingCarts.Add(cart);
                await _context.SaveChangesAsync();
            }

            var existingItem = cart.Items.FirstOrDefault(i => i.ProductVariantId == request.ProductVariantId);
            
            int availableStock = variant.StockQuantity - variant.ReservedQuantity;
            int proposedNewQuantity = request.Quantity;

            if (proposedNewQuantity > availableStock)
                return BadRequest(new { message = $"Cannot add to cart. Only {availableStock} units are currently available.", availableStock });

            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
            }
            else
            {
                cart.Items.Add(new ShoppingCartItem { ShoppingCartId = cart.Id, ProductVariantId = request.ProductVariantId, Quantity = request.Quantity });
            }

            variant.ReservedQuantity += request.Quantity;
            cart.LastUpdated = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Item added to cart successfully." });
        }

        [HttpGet]
        public async Task<ActionResult<CartResponseDto>> GetCart()
        {
            int secureUserId = GetSecureUserId();
            var cart = await _context.ShoppingCarts
                .Include(c => c.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product).ThenInclude(p => p!.Images)
                .FirstOrDefaultAsync(c => c.UserId == secureUserId);

            if (cart == null) return Ok(new CartResponseDto { UserId = secureUserId });

            var now = DateTime.UtcNow;
            var activePromotions = await _context.Promotions.Include(p => p.PromotionProducts).Include(p => p.PromotionCategories).Where(promo => promo.Status == "ACTIVE" && promo.StartDate <= now && promo.EndDate >= now).ToListAsync();
            var activeTaxes = await _context.TaxRules.Include(t => t.TaxRuleProducts).Include(t => t.TaxRuleCategories).Where(t => t.IsActive && t.StartDate <= now && (t.EndDate == null || t.EndDate >= now)).ToListAsync();
            var activeCharges = await _context.ProductCharges.Where(pc => pc.IsActive).ToListAsync();

            var response = new CartResponseDto { CartId = cart.Id, UserId = cart.UserId };

            decimal calcSubtotal = 0;
            decimal calcDiscount = 0;
            decimal calcTax = 0;

            foreach (var item in cart.Items)
            {
                var variant = item.Variant;
                if (variant == null || variant.Product == null) continue;

                decimal originalTotal = variant.Price * item.Quantity;
                calcSubtotal += originalTotal;

                decimal itemDiscount = 0;
                var applicablePromo = activePromotions.FirstOrDefault(promo => promo.PromotionProducts.Any(pp => pp.ProductId == variant.Product.Id) || promo.PromotionCategories.Any(pc => pc.CategoryId == variant.Product.CategoryId) || (!promo.PromotionProducts.Any() && !promo.PromotionCategories.Any()));

                if (applicablePromo != null)
                {
                    if (applicablePromo.Type.ToString() == "PERCENTAGE_DISCOUNT") itemDiscount = originalTotal * (applicablePromo.DiscountValue / 100m);
                    else if (applicablePromo.Type.ToString() == "FIXED_AMOUNT_DISCOUNT") itemDiscount = applicablePromo.DiscountValue * item.Quantity;
                }
                
                calcDiscount += itemDiscount;
                decimal finalItemPrice = originalTotal - itemDiscount;

                var applicableTaxes = activeTaxes.Where(t => 
                    (!t.TaxRuleProducts.Any() && !t.TaxRuleCategories.Any()) || 
                    t.TaxRuleProducts.Any(tp => tp.ProductId == variant.Product.Id) || 
                    t.TaxRuleCategories.Any(tc => tc.CategoryId == variant.Product.CategoryId)
                ).ToList();

                if (applicableTaxes.Any()) 
                    foreach (var tax in applicableTaxes) calcTax += finalItemPrice * (tax.RatePercentage / 100m);
                else 
                    calcTax += 0m; // Fixed: Removed the 8% fallback

                var primaryImage = variant.Product.Images?.FirstOrDefault(i => i.IsPrimary)?.ImageUrl ?? variant.Product.Images?.FirstOrDefault()?.ImageUrl ?? string.Empty;
                int availableStock = variant.StockQuantity - (variant.ReservedQuantity - item.Quantity); 

                response.Items.Add(new CartItemResponseDto
                {
                    Id = item.Id, ProductVariantId = item.ProductVariantId, ProductName = variant.Product.Name, Brand = variant.Product.Brand, VariantName = variant.WeightOrSize, ImageUrl = primaryImage, Quantity = item.Quantity, AvailableStock = availableStock, UnitPrice = variant.Price, IsAvailable = variant.IsActive && variant.Product.IsActive && availableStock >= item.Quantity
                });
            }

            decimal rawSubtotal = calcSubtotal - calcDiscount;
            decimal deliveryFee = 0;
            foreach (var charge in activeCharges)
            {
                if (rawSubtotal >= charge.MinOrderAmount && (!charge.MaxOrderAmount.HasValue || rawSubtotal <= charge.MaxOrderAmount.Value))
                {
                    if (charge.ChargeType == "FIXED") deliveryFee += charge.AmountOrPercentage;
                    else if (charge.ChargeType == "PERCENTAGE") deliveryFee += rawSubtotal * (charge.AmountOrPercentage / 100m);
                }
            }

            response.Subtotal = calcSubtotal;
            response.DiscountAmount = calcDiscount;
            response.TaxAmount = calcTax;
            response.DeliveryFee = deliveryFee;
            response.GrandTotal = Math.Max(0, rawSubtotal + calcTax + deliveryFee);

            return Ok(response);
        }
        public class UpdateCartItemDto { public int Quantity { get; set; } }

        [HttpPut("update/{itemId}")]
        public async Task<ActionResult> UpdateCartItem(int itemId, [FromBody] UpdateCartItemDto request)
        {
            if (request.Quantity <= 0) return BadRequest("Quantity must be greater than zero.");

            var cartItem = await _context.ShoppingCartItems.Include(i => i.Variant).FirstOrDefaultAsync(i => i.Id == itemId);
            if (cartItem == null || cartItem.Variant == null) return NotFound("Cart item not found.");

            int quantityDifference = request.Quantity - cartItem.Quantity;
            int availableStock = cartItem.Variant.StockQuantity - cartItem.Variant.ReservedQuantity;

            if (quantityDifference > 0 && quantityDifference > availableStock)
                return BadRequest(new { message = $"Cannot update. Only {availableStock} additional units available.", availableStock });

            cartItem.Variant.ReservedQuantity += quantityDifference;
            cartItem.Quantity = request.Quantity;
            
            var cart = await _context.ShoppingCarts.FirstOrDefaultAsync(c => c.Id == cartItem.ShoppingCartId);
            if (cart != null) cart.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cart updated." });
        }

        [HttpDelete("remove/{itemId}")]
        public async Task<ActionResult> RemoveCartItem(int itemId)
        {
            var cartItem = await _context.ShoppingCartItems.Include(i => i.Variant).FirstOrDefaultAsync(i => i.Id == itemId);
            if (cartItem == null) return NotFound("Cart item not found.");

            if (cartItem.Variant != null)
            {
                cartItem.Variant.ReservedQuantity -= cartItem.Quantity;
                if (cartItem.Variant.ReservedQuantity < 0) cartItem.Variant.ReservedQuantity = 0;
            }

            _context.ShoppingCartItems.Remove(cartItem);
            
            var cart = await _context.ShoppingCarts.FirstOrDefaultAsync(c => c.Id == cartItem.ShoppingCartId);
            if (cart != null) cart.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Item removed from cart. Reservation released." });
        }
    }
}