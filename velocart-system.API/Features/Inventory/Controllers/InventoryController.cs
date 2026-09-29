using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Inventory.Models;

namespace velocart_system.API.Features.Inventory.Controllers
{
    public class ReceiveGoodsRequestDto {
        public int PurchaseOrderId { get; set; }
        public string Notes { get; set; } = string.Empty;
        public List<ReceiveGoodsItemDto> Items { get; set; } = new List<ReceiveGoodsItemDto>();
    }

    public class CreatePurchaseOrderDto
    {
        public int SupplierId { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public List<CreatePurchaseOrderItemDto> Items { get; set; } = new List<CreatePurchaseOrderItemDto>();
    }

    public class CreatePurchaseOrderItemDto
    {
        public int ProductVariantId { get; set; }
        public int OrderedQuantity { get; set; }
        public decimal PurchasePrice { get; set; }
    }
    
    public class ReceiveGoodsItemDto {
        public int PurchaseOrderItemId { get; set; }
        public int QuantityAccepted { get; set; }
        public int QuantityRejected { get; set; }
        public string RejectionReason { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime ManufacturingDate { get; set; }
        public DateTime ExpiryDate { get; set; }
    }

    public class CreateSupplierDto { public string Name { get; set; } = string.Empty; }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN, PRODUCTMANAGER")] 
    public class InventoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InventoryController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. CREATE PURCHASE ORDER
        // ==========================================
        [HttpPost("purchase-orders")]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderDto request)
        {
            if (!request.Items.Any()) return BadRequest(new { message = "Purchase order must contain at least one item." });

            // STRICT DATE VALIDATION: Prevent Past Dates
            if (request.ExpectedDeliveryDate.Date < DateTime.UtcNow.Date)
                return BadRequest(new { message = "Expected delivery date cannot be set in the past." });

            var po = new PurchaseOrder
            {
                SupplierId = request.SupplierId,
                OrderDate = DateTime.UtcNow,
                ExpectedDeliveryDate = DateTime.SpecifyKind(request.ExpectedDeliveryDate, DateTimeKind.Utc),
                Status = POStatus.Placed,
                TotalAmount = request.Items.Sum(i => i.OrderedQuantity * i.PurchasePrice),
                Items = request.Items.Select(i => new PurchaseOrderItem
                {
                    ProductVariantId = i.ProductVariantId,
                    OrderedQuantity = i.OrderedQuantity,
                    PurchasePrice = i.PurchasePrice,
                    ReceivedQuantity = 0
                }).ToList()
            };

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Purchase Order created successfully.", id = po.Id });
        }

        // ==========================================
        // 2. UPDATE/EDIT PURCHASE ORDER
        // ==========================================
        [HttpPut("purchase-orders/{id}")]
        public async Task<IActionResult> UpdatePurchaseOrder(int id, [FromBody] CreatePurchaseOrderDto request)
        {
            var po = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            
            if (po == null) return NotFound(new { message = "Purchase Order not found." });
            
            // Validation: Cannot edit if goods have already started arriving
            if (po.Status != POStatus.Placed) 
                return BadRequest(new { message = "Only 'Placed' orders can be edited. Orders currently being received are locked." });

            // STRICT DATE VALIDATION: Prevent Past Dates
            if (request.ExpectedDeliveryDate.Date < DateTime.UtcNow.Date)
                return BadRequest(new { message = "Expected delivery date cannot be set in the past." });

            po.SupplierId = request.SupplierId;
            po.ExpectedDeliveryDate = DateTime.SpecifyKind(request.ExpectedDeliveryDate, DateTimeKind.Utc);
            po.TotalAmount = request.Items.Sum(i => i.OrderedQuantity * i.PurchasePrice);

            // Replace Old Items with New Items securely
            _context.PurchaseOrderItems.RemoveRange(po.Items);
            po.Items = request.Items.Select(i => new PurchaseOrderItem
            {
                ProductVariantId = i.ProductVariantId,
                OrderedQuantity = i.OrderedQuantity,
                PurchasePrice = i.PurchasePrice,
                ReceivedQuantity = 0
            }).ToList();

            await _context.SaveChangesAsync();
            return Ok(new { message = "Purchase Order updated successfully." });
        }

        // ==========================================
        // 3. DELETE PURCHASE ORDER (HISTORY CLEANUP)
        // ==========================================
        [HttpDelete("purchase-orders/{id}")]
        public async Task<IActionResult> DeletePurchaseOrder(int id)
        {
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFound(new { message = "Purchase Order not found." });

            // Validation: Prevent accidental deletion of Active/Pending orders
            if (po.Status != POStatus.Received && po.Status != POStatus.Cancelled)
                return BadRequest(new { message = "You can only delete historical orders (Fully Received or Cancelled)." });

            _context.PurchaseOrders.Remove(po);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Purchase Order permanently deleted from history." });
        }

        // ==========================================
        // 4. RECEIVE GOODS
        // ==========================================
        [HttpPost("receive-goods")]
        public async Task<IActionResult> ReceiveGoods([FromBody] ReceiveGoodsRequestDto request)
        {
            var adminUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System Admin";

            var po = await _context.PurchaseOrders
                .Include(p => p.Items).ThenInclude(i => i.ProductVariant)
                .FirstOrDefaultAsync(p => p.Id == request.PurchaseOrderId);

            if (po == null) return NotFound("Purchase Order not found.");
            if (po.Status == POStatus.Received || po.Status == POStatus.Cancelled) 
                return BadRequest("Cannot receive goods for a Closed or Cancelled Purchase Order.");

            var receipt = new GoodsReceipt { PurchaseOrderId = po.Id, ReceivedBy = adminUser, Notes = request.Notes };

            foreach (var incomingItem in request.Items)
            {
                var poItem = po.Items.FirstOrDefault(i => i.Id == incomingItem.PurchaseOrderItemId);
                if (poItem == null) continue;

                poItem.ReceivedQuantity += incomingItem.QuantityAccepted;

                receipt.Items.Add(new GoodsReceiptItem {
                    PurchaseOrderItemId = poItem.Id, QuantityReceived = incomingItem.QuantityAccepted,
                    QuantityRejected = incomingItem.QuantityRejected, RejectionReason = incomingItem.RejectionReason
                });

                if (incomingItem.QuantityAccepted > 0)
                {
                    var newBatch = new ProductBatch {
                        ProductVariantId = poItem.ProductVariantId, 
                        BatchNumber = incomingItem.BatchNumber,
                        ManufacturingDate = DateTime.SpecifyKind(incomingItem.ManufacturingDate, DateTimeKind.Utc), 
                        ExpiryDate = DateTime.SpecifyKind(incomingItem.ExpiryDate, DateTimeKind.Utc),
                        InitialQuantity = incomingItem.QuantityAccepted, 
                        CurrentQuantity = incomingItem.QuantityAccepted,
                        CostPrice = poItem.PurchasePrice
                    };
                    _context.ProductBatches.Add(newBatch);

                    int originalQty = poItem.ProductVariant.StockQuantity;
                    poItem.ProductVariant.StockQuantity += incomingItem.QuantityAccepted;
                    poItem.ProductVariant.CostPrice = poItem.PurchasePrice; 

                    _context.InventoryTransactions.Add(new InventoryTransaction {
                        ProductVariantId = poItem.ProductVariantId, Type = TransactionType.Received,
                        QuantityChanged = incomingItem.QuantityAccepted, QuantityBefore = originalQty,
                        QuantityAfter = poItem.ProductVariant.StockQuantity, ReferenceDocument = $"PO-{po.Id}", Reason = "Supplier Delivery"
                    });
                }
            }

            bool isFullyReceived = po.Items.All(i => i.ReceivedQuantity >= i.OrderedQuantity);
            po.Status = isFullyReceived ? POStatus.Received : POStatus.PartiallyReceived;

            _context.GoodsReceipts.Add(receipt);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Goods received successfully. PO Status updated to {po.Status}.", receiptId = receipt.Id });
        }

        [HttpGet("purchase-orders")]
        public async Task<IActionResult> GetPurchaseOrders()
        {
            var pos = await _context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.Items)
                    .ThenInclude(i => i.ProductVariant)
                        .ThenInclude(v => v.Product)
                .OrderByDescending(po => po.OrderDate)
                .ToListAsync();
            return Ok(pos);
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetInventoryDashboard()
        {
            var variants = await _context.ProductVariants
                .Include(v => v.Product).Include(v => v.Batches)
                .Where(v => v.Product != null && v.Product.IsActive && v.IsActive).ToListAsync();

            var now = DateTime.UtcNow;
            decimal totalValuation = variants.Sum(v => v.StockQuantity * v.CostPrice);
            int lowStockCount = variants.Count(v => v.StockQuantity <= 10 && v.StockQuantity > 0);
            int outOfStockCount = variants.Count(v => v.StockQuantity == 0);
            int nearExpiryCount = variants.Count(v => v.Batches.Any(b => b.CurrentQuantity > 0 && b.ExpiryDate > now && b.ExpiryDate <= now.AddDays(v.Product!.ExpiryAlertDays)));
            int expiredCount = variants.Count(v => v.Batches.Any(b => b.CurrentQuantity > 0 && b.ExpiryDate <= now));

            var productDetails = variants.Select(v => new
            {
                Id = v.Id, ProductName = v.Product!.Name, VariantName = v.WeightOrSize, SKU = v.SKU,
                PhysicalStock = v.StockQuantity, ReservedStock = v.ReservedQuantity, AvailableStock = v.StockQuantity - v.ReservedQuantity,
                Valuation = v.StockQuantity * v.CostPrice, Status = v.StockQuantity == 0 ? "OUT_OF_STOCK" : (v.StockQuantity <= 10 ? "LOW_STOCK" : "IN_STOCK"),
                HasExpiredBatches = v.Batches.Any(b => b.CurrentQuantity > 0 && b.ExpiryDate <= now),
                HasNearExpiryBatches = v.Batches.Any(b => b.CurrentQuantity > 0 && b.ExpiryDate > now && b.ExpiryDate <= now.AddDays(v.Product.ExpiryAlertDays))
            }).OrderBy(v => v.AvailableStock).ToList();

            return Ok(new { Summary = new { TotalValuation = totalValuation, TotalProducts = variants.Count, LowStockCount = lowStockCount, OutOfStockCount = outOfStockCount, NearExpiryCount = nearExpiryCount, ExpiredCount = expiredCount }, Products = productDetails });
        }

        [HttpGet("audit-ledger")]
        public async Task<IActionResult> GetAuditLedger()
        {
            var transactions = await _context.InventoryTransactions
                .Include(t => t.ProductVariant).ThenInclude(v => v.Product)
                .OrderByDescending(t => t.Timestamp).Take(100)
                .Select(t => new { Id = t.Id, Timestamp = t.Timestamp, Type = t.Type.ToString(), ProductName = $"{t.ProductVariant.Product!.Name} ({t.ProductVariant.WeightOrSize})", SKU = t.ProductVariant.SKU, QuantityChanged = t.QuantityChanged, QuantityBefore = t.QuantityBefore, QuantityAfter = t.QuantityAfter, ReferenceDocument = t.ReferenceDocument, Reason = t.Reason })
                .ToListAsync();
            return Ok(transactions);
        }

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers.Select(s => new { s.Id, s.Name }).ToListAsync();
            return Ok(suppliers);
        }

        [HttpGet("variants")]
        public async Task<IActionResult> GetVariants()
        {
            var variants = await _context.ProductVariants
                .Include(v => v.Product).Where(v => v.IsActive && v.Product!.IsActive)
                .Select(v => new { v.Id, ProductName = v.Product!.Name, v.WeightOrSize, v.SKU })
                .ToListAsync();
            return Ok(variants);
        }

        [HttpPost("suppliers")]
        public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Supplier name is required." });
            var supplier = new Supplier { Name = request.Name, CreatedAt = DateTime.UtcNow };
            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();
            return Ok(new { id = supplier.Id, name = supplier.Name });
        }
    }
}