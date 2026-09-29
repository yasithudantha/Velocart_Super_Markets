using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Loyalty.DTOs;

namespace velocart_system.API.Features.Loyalty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // STRICT SRS RULE 8: Customer Isolation
    public class LoyaltyController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LoyaltyController(ApplicationDbContext context)
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

        [HttpGet("dashboard")]
        public async Task<ActionResult<LoyaltyDashboardResponseDto>> GetMyLoyaltyDashboard()
        {
            int secureUserId = GetSecureUserId();

            var loyaltyAccount = await _context.LoyaltyAccounts
                .Include(l => l.User)
                .Include(l => l.CurrentTier)
                .FirstOrDefaultAsync(l => l.UserId == secureUserId);

            if (loyaltyAccount == null || loyaltyAccount.User == null || loyaltyAccount.CurrentTier == null)
                return NotFound(new { message = "Loyalty account not found for this user." });

            var allRules = await _context.LoyaltyRules.OrderBy(r => r.MinimumPoints).ToListAsync();
            
            string nextTierName = "Maximum Tier Reached";
            int pointsForNext = 0;
            decimal progress = 100m;

            var nextRule = allRules.FirstOrDefault(r => r.MinimumPoints > loyaltyAccount.CurrentPointsBalance);
            if (nextRule != null)
            {
                nextTierName = nextRule.TierName;
                pointsForNext = nextRule.MinimumPoints - loyaltyAccount.CurrentPointsBalance;
                
                int currentTierMin = loyaltyAccount.CurrentTier.MinimumPoints;
                int range = nextRule.MinimumPoints - currentTierMin;
                int pointsIntoCurrentTier = loyaltyAccount.CurrentPointsBalance - currentTierMin;
                
                if (range > 0)
                {
                    progress = Math.Round(((decimal)pointsIntoCurrentTier / range) * 100, 2);
                }
            }

            var dashboardData = new LoyaltyDashboardResponseDto
            {
                CustomerName = loyaltyAccount.User.FullName,
                LoyaltyIdNumber = loyaltyAccount.LoyaltyIdNumber,
                CurrentTier = loyaltyAccount.CurrentTier.TierName,
                Status = loyaltyAccount.Status,
                ExpiryDate = loyaltyAccount.ExpiryDate,
                CurrentPointsBalance = loyaltyAccount.CurrentPointsBalance,
                TotalPointsEarned = loyaltyAccount.TotalPointsEarned,
                TotalPointsRedeemed = loyaltyAccount.TotalPointsRedeemed,
                TotalEligibleSpend = loyaltyAccount.TotalEligibleSpend,
                NextTier = nextTierName,
                PointsRequiredForNextTier = pointsForNext,
                ProgressPercentage = progress
            };

            return Ok(dashboardData);
        }
    }
}