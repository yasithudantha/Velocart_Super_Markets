using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Inventory.Models; // <-- FIXED: Added correct namespace!

namespace velocart_system.API.Features.AgenticAI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SupplyChainAnalyticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SupplyChainAnalyticsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // TOOL 1 (Agent 1): Demand Forecasting
        [HttpGet("demand-forecast")]
        public async Task<ActionResult> GetDemandForecast()
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            // 1. Calculate sales velocity from InventoryTransactions (Type = Sold)
            var salesData = await _context.InventoryTransactions
                .Where(t => t.Type == TransactionType.Sold && t.Timestamp >= thirtyDaysAgo) // <-- FIXED: Removed 'Models.' prefix
                .GroupBy(t => t.ProductVariantId)
                .Select(g => new { VariantId = g.Key, UnitsSold30Days = g.Sum(t => Math.Abs(t.QuantityChanged)) })
                .ToDictionaryAsync(k => k.VariantId, v => v.UnitsSold30Days);

            // 2. See what customers are currently holding in their carts
            var cartReservations = await _context.ShoppingCartItems
                .GroupBy(i => i.ProductVariantId)
                .Select(g => new { VariantId = g.Key, ReservedQty = g.Sum(i => i.Quantity) })
                .ToDictionaryAsync(k => k.VariantId, v => v.ReservedQty);

            var variants = await _context.ProductVariants
                .Include(v => v.Product)
                .Where(v => v.IsActive)
                .ToListAsync();

            // 3. AI Intelligence: Calculate Burn Rate and "Days Until Zero"
            var analysis = variants.Select(v => {
                var sold30 = salesData.ContainsKey(v.Id) ? salesData[v.Id] : 0;
                var dailyBurn = sold30 / 30.0;
                var inCarts = cartReservations.ContainsKey(v.Id) ? cartReservations[v.Id] : 0;
                
                // Subtract cart holds from actual stock to get "safe" stock
                var effectiveStock = v.StockQuantity - inCarts;
                var daysUntilZero = dailyBurn > 0 ? (int)(effectiveStock / dailyBurn) : 999;

                return new {
                    ProductVariantId = v.Id,
                    ProductName = v.Product?.Name,
                    VariantName = v.WeightOrSize,
                    CurrentStock = v.StockQuantity,
                    InActiveCarts = inCarts,
                    UnitsSoldLast30Days = sold30,
                    DailyBurnRate = Math.Round(dailyBurn, 2),
                    DaysUntilZeroStock = daysUntilZero
                };
            })
            // Only alert the AI to items that will run out in the next 14 days OR have very low stock
            .Where(x => x.DaysUntilZeroStock <= 14 || x.CurrentStock <= 20) 
            .OrderBy(x => x.DaysUntilZeroStock)
            .ToList();

            if (!analysis.Any()) return Ok(new { message = "Inventory levels are healthy. No PO required at this time." });

            return Ok(analysis);
        }

        // TOOL 2 (Agent 2): Supplier Comparison Engine
        [HttpGet("supplier-catalog")]
        public async Task<ActionResult> GetSupplierCatalog()
        {
            var catalog = await _context.SupplierProducts
                .Include(sp => sp.Supplier)
                .Select(sp => new {
                    ProductVariantId = sp.ProductVariantId,
                    SupplierId = sp.SupplierId,
                    SupplierName = sp.Supplier.Name,
                    PurchasePrice = sp.AgreedPurchasePrice,
                    MinimumOrderQuantity = sp.MinimumOrderQuantity,
                    LeadTimeDays = sp.LeadTimeDays
                })
                .ToListAsync();

            return Ok(catalog);
        }
    }
}