using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;

namespace velocart_system.API.Features.Inventory.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Note: We will allow internal service calls or Admin/Managers to access this
    public class InventoryAnalyticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InventoryAnalyticsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // TOOL 1 FOR AGENT 1: Get Expiring Batches and Sales Velocity
        [HttpGet("expiring")]
        public async Task<ActionResult> GetExpiringInventoryWithVelocity([FromQuery] int daysThreshold = 30)
        {
            var targetDate = DateTime.UtcNow.AddDays(daysThreshold);
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            // 1. Find batches expiring soon with stock > 0
            var expiringBatches = await _context.ProductBatches
                .Include(b => b.ProductVariant)
                .ThenInclude(v => v!.Product)
                .Where(b => b.CurrentQuantity > 0 && b.ExpiryDate <= targetDate)
                .ToListAsync();

            if (!expiringBatches.Any())
                return Ok(new { message = "No batches expiring within the threshold." });

            var variantIds = expiringBatches.Select(b => b.ProductVariantId).Distinct().ToList();

            // 2. Calculate "Sales Velocity" (How many units sold in the last 30 days)
            var recentSales = await _context.InventoryTransactions
                .Where(t => variantIds.Contains(t.ProductVariantId) && t.Type == Models.TransactionType.Sold && t.Timestamp >= thirtyDaysAgo)
                .GroupBy(t => t.ProductVariantId)
                .Select(g => new { 
                    VariantId = g.Key, 
                    UnitsSold30Days = g.Sum(t => Math.Abs(t.QuantityChanged)) 
                })
                .ToDictionaryAsync(k => k.VariantId, v => v.UnitsSold30Days);

            // 3. Format the data for the AI Agent
            var result = expiringBatches.Select(b => new
            {
                BatchId = b.Id,
                ProductId = b.ProductVariant?.ProductId,
                ProductName = b.ProductVariant?.Product?.Name,
                Brand = b.ProductVariant?.Product?.Brand,
                VariantName = b.ProductVariant?.WeightOrSize,
                OriginalPrice = b.ProductVariant?.Price,
                ExpiringQuantity = b.CurrentQuantity,
                DaysUntilExpiry = (b.ExpiryDate - DateTime.UtcNow).Days,
                UnitsSoldLast30Days = recentSales.ContainsKey(b.ProductVariantId) ? recentSales[b.ProductVariantId] : 0
            }).OrderBy(x => x.DaysUntilExpiry).ToList();

            return Ok(result);
        }
    }
}