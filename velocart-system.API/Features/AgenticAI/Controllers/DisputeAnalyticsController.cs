using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;

namespace velocart_system.API.Features.AgenticAI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DisputeAnalyticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DisputeAnalyticsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // TOOL FOR AGENT 1: Fetch open complaints with full context
        [HttpGet("pending")]
        public async Task<ActionResult> GetPendingDisputes()
        {
            // Use your exact schema: Status == "OPEN" and include Customer
            var complaints = await _context.DeliveryComplaints
                .Include(c => c.Order)
                    .ThenInclude(o => o!.Items)
                .Include(c => c.Customer)
                .Where(c => c.Status == "OPEN")
                .ToListAsync();

            if (!complaints.Any())
                return Ok(new { message = "No open delivery complaints." });

            var result = new List<object>();
            foreach(var c in complaints)
            {
                // Fetch Loyalty context AND Include the CurrentTier (LoyaltyRule) object
                var loyalty = await _context.LoyaltyAccounts
                    .Include(l => l.CurrentTier)
                    .FirstOrDefaultAsync(l => l.UserId == c.CustomerId);
                
                result.Add(new {
                    ComplaintId = c.Id,
                    OrderId = c.OrderId,
                    Subject = c.Subject,
                    Description = c.Description,
                    OrderGrandTotal = c.Order?.GrandTotal ?? 0,
                    PurchasedItems = c.Order?.Items.Select(i => new { 
                        ItemName = i.ProductName, 
                        Qty = i.Quantity, 
                        PricePerUnit = i.UnitPrice 
                    }).ToList(),
                    CustomerName = c.Customer?.FullName ?? "Unknown",
                    // FIXED: Access the TierName string property safely
                    LoyaltyTier = loyalty?.CurrentTier?.TierName ?? "Standard",
                    TotalLifetimePoints = loyalty?.TotalPointsEarned ?? 0
                });
            }
            
            return Ok(result);
        }
    }
}