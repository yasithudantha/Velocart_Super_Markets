using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;

namespace velocart_system.API.Features.Loyalty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")] // SRS 7.7 & 7.6
    public class LoyaltyReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LoyaltyReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<ActionResult> GetLoyaltySummaryReport()
        {
            // SRS 7.7: Loyalty Customers and Tier Breakdown
            var loyaltyAccounts = await _context.LoyaltyAccounts.Include(l => l.CurrentTier).ToListAsync();
            
            int totalCustomers = loyaltyAccounts.Count;
            int silverCount = loyaltyAccounts.Count(l => l.CurrentTier?.TierName == "Silver");
            int goldCount = loyaltyAccounts.Count(l => l.CurrentTier?.TierName == "Gold");
            int platinumCount = loyaltyAccounts.Count(l => l.CurrentTier?.TierName == "Platinum");

            // SRS 7.7: Points Metrics
            var earnedPoints = await _context.LoyaltyTransactions.Where(t => t.TransactionType == "EARNED").SumAsync(t => t.Points);
            // Redeemed and Expired are stored as negative numbers, so we use Math.Abs
            var redeemedPoints = await _context.LoyaltyTransactions.Where(t => t.TransactionType == "REDEEMED").SumAsync(t => t.Points);
            var expiredPoints = await _context.LoyaltyTransactions.Where(t => t.TransactionType == "EXPIRED").SumAsync(t => t.Points);

            // SRS 7.7: Orders Paid Using Loyalty Points
            var loyaltyOrders = await _context.Orders.Where(o => o.LoyaltyPointsUsed > 0 && o.OrderStatus != "CANCELLED").ToListAsync();
            int ordersPaidWithPoints = loyaltyOrders.Count;
            decimal totalLoyaltyDiscountValue = loyaltyOrders.Sum(o => o.LoyaltyDiscountAmount);
            decimal totalSalesFromLoyaltyOrders = loyaltyOrders.Sum(o => o.GrandTotal);

            var report = new
            {
                CustomerMetrics = new {
                    TotalLoyaltyCustomers = totalCustomers,
                    SilverCustomers = silverCount,
                    GoldCustomers = goldCount,
                    PlatinumCustomers = platinumCount
                },
                PointMetrics = new {
                    TotalPointsEarned = earnedPoints,
                    TotalPointsRedeemed = Math.Abs(redeemedPoints),
                    TotalPointsExpired = Math.Abs(expiredPoints)
                },
                SalesMetrics = new {
                    OrdersPaidUsingPoints = ordersPaidWithPoints,
                    TotalLoyaltyRedemptionValue = totalLoyaltyDiscountValue,
                    SalesFromLoyaltyOrders = totalSalesFromLoyaltyOrders
                },
                GeneratedAt = DateTime.UtcNow
            };

            return Ok(report);
        }

        // ========================================================
        // NEW: SRS 7.6 - Paginated Customer Directory by Tier
        // ========================================================
        [HttpGet("customers")]
        public async Task<ActionResult> GetLoyaltyCustomers([FromQuery] string tier, [FromQuery] int page = 1, [FromQuery] int pageSize = 5)
        {
            var query = _context.LoyaltyAccounts
                .Include(l => l.User)
                .Include(l => l.CurrentTier)
                .Where(l => l.CurrentTier != null && l.CurrentTier.TierName.ToLower() == tier.ToLower());

            var totalItems = await query.CountAsync();
            var customers = await query
                .OrderByDescending(l => l.TotalPointsEarned) // Show highest earners first
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new {
                    l.Id,
                    l.LoyaltyIdNumber,
                    CustomerName = l.User != null ? l.User.FullName : "Unknown",
                    Email = l.User != null ? l.User.Email : "Unknown",
                    l.CurrentPointsBalance,
                    l.TotalPointsEarned,
                    l.Status
                })
                .ToListAsync();

            return Ok(new {
                Tier = tier,
                TotalCount = totalItems,
                Page = page,
                PageSize = pageSize,
                HasMore = (page * pageSize) < totalItems,
                Customers = customers
            });
        }
    }
}