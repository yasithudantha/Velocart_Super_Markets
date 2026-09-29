using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using velocart_system.API.Data;

namespace velocart_system.API.Features.Admin.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "MAINADMIN")] // Strictly protected
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public ReportsController(ApplicationDbContext context) { _context = context; }

        [HttpGet("financials")]
        public async Task<ActionResult> GetFinancialReport()
        {
            var totalIncome = await _context.Orders.Where(o => o.PaymentStatus == "PAID").SumAsync(o => o.GrandTotal);
            
            // Assuming POStatus is an enum, we check the integer/string values. Exclude Cancelled.
            var totalExpense = await _context.PurchaseOrders
                .Where(po => po.Status != velocart_system.API.Features.Inventory.Models.POStatus.Cancelled)
                .SumAsync(po => po.TotalAmount);

            return Ok(new {
                ReportName = "Profit & Loss (P&L) Statement",
                GeneratedAt = DateTime.UtcNow,
                TotalRevenue = totalIncome,
                TotalExpenses = totalExpense,
                NetProfit = totalIncome - totalExpense,
                ProfitMargin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
            });
        }

        [HttpGet("logistics")]
        public async Task<ActionResult> GetLogisticsReport()
        {
            var totalOrders = await _context.Orders.CountAsync();
            var delivered = await _context.Orders.CountAsync(o => o.OrderStatus == "DELIVERED");
            var pending = await _context.Orders.CountAsync(o => o.OrderStatus != "DELIVERED" && o.OrderStatus != "CANCELLED");
            var failed = await _context.Orders.CountAsync(o => o.OrderStatus == "CANCELLED");

            var totalComplaints = await _context.DeliveryComplaints.CountAsync();
            var resolvedComplaints = await _context.DeliveryComplaints.CountAsync(c => c.Status == "RESOLVED");
            var pendingComplaints = totalComplaints - resolvedComplaints;

            return Ok(new {
                ReportName = "Delivery Success & Complaints",
                GeneratedAt = DateTime.UtcNow,
                TotalOrders = totalOrders,
                SuccessfulDeliveries = delivered,
                PendingDeliveries = pending,
                FailedDeliveries = failed,
                DeliverySuccessRate = totalOrders > 0 ? Math.Round((double)delivered / totalOrders * 100, 2) : 0,
                TotalComplaints = totalComplaints,
                ResolvedComplaints = resolvedComplaints,
                PendingComplaints = pendingComplaints,
                ComplaintRate = totalOrders > 0 ? Math.Round((double)totalComplaints / totalOrders * 100, 2) : 0
            });
        }

        [HttpGet("loyalty")]
        public async Task<ActionResult> GetLoyaltyReport()
        {
            var totalEarned = await _context.LoyaltyAccounts.SumAsync(l => l.TotalPointsEarned);
            var totalRedeemed = await _context.LoyaltyAccounts.SumAsync(l => l.TotalPointsRedeemed);
            var activeBalance = await _context.LoyaltyAccounts.SumAsync(l => l.CurrentPointsBalance);
            var financialLiability = await _context.Orders.SumAsync(o => o.LoyaltyDiscountAmount); // Money saved by users

            return Ok(new {
                ReportName = "VelocityFamily Loyalty Analytics",
                GeneratedAt = DateTime.UtcNow,
                TotalPointsMinted = totalEarned,
                TotalPointsRedeemed = totalRedeemed,
                OutstandingPointBalance = activeBalance,
                TotalCustomerSavingsRs = financialLiability
            });
        }

        [HttpGet("inventory")]
        public async Task<ActionResult> GetInventoryReport()
        {
            var totalSkus = await _context.ProductVariants.CountAsync(v => v.IsActive);
            var totalStockItems = await _context.ProductVariants.SumAsync(v => v.StockQuantity);
            var totalValuation = await _context.ProductVariants.SumAsync(v => v.StockQuantity * v.CostPrice);

            return Ok(new {
                ReportName = "Inventory Asset Valuation",
                GeneratedAt = DateTime.UtcNow,
                ActiveSKUs = totalSkus,
                TotalItemsInWarehouse = totalStockItems,
                CurrentInventoryValueRs = totalValuation
            });
        }
    }
}