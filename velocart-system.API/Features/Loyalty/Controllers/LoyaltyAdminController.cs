using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Loyalty.Models;

namespace velocart_system.API.Features.Loyalty.Controllers
{
    // DTO for updating the tier rules (SRS 7.1 & 7.3)
    public class UpdateLoyaltyRuleDto
    {
        public int MinimumPoints { get; set; }
        public int? MaximumPoints { get; set; }
        public decimal CurrencyAmountPerPoint { get; set; }
        public int MaxRedeemablePointsPerOrder { get; set; }
        public decimal MaxDiscountPercentage { get; set; }
        public int PointExpiryDays { get; set; }
        public int TierEvaluationPeriodDays { get; set; }
    }

    public class CreateLoyaltyRuleDto : UpdateLoyaltyRuleDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string TierName { get; set; } = string.Empty;
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")] // Restricted to Management
    public class LoyaltyAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LoyaltyAdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("rules")]
        public async Task<ActionResult> GetLoyaltyRules()
        {
            var rules = await _context.LoyaltyRules
                .OrderBy(r => r.MinimumPoints)
                .ToListAsync();
            return Ok(rules);
        }

        [HttpPut("rules/{id}")]
        public async Task<ActionResult> UpdateLoyaltyRule(int id, [FromBody] UpdateLoyaltyRuleDto request)
        {
            var rule = await _context.LoyaltyRules.FindAsync(id);
            if (rule == null) return NotFound("Loyalty tier rule not found.");

            // SE Validations (Preventing negative thresholds and bad economics)
            if (request.MinimumPoints < 0) return BadRequest("Minimum points cannot be negative.");
            if (request.MaximumPoints.HasValue && request.MaximumPoints <= request.MinimumPoints)
                return BadRequest("Maximum points must be strictly greater than minimum points.");
            if (request.CurrencyAmountPerPoint <= 0) return BadRequest("Currency exchange rate must be greater than zero.");
            if (request.MaxDiscountPercentage < 0 || request.MaxDiscountPercentage > 100) return BadRequest("Discount percentage must be between 0 and 100.");

            rule.MinimumPoints = request.MinimumPoints;
            rule.MaximumPoints = request.MaximumPoints;
            rule.CurrencyAmountPerPoint = request.CurrencyAmountPerPoint;
            rule.MaxRedeemablePointsPerOrder = request.MaxRedeemablePointsPerOrder;
            rule.MaxDiscountPercentage = request.MaxDiscountPercentage;
            rule.PointExpiryDays = request.PointExpiryDays;
            rule.TierEvaluationPeriodDays = request.TierEvaluationPeriodDays;
            rule.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Successfully updated economic rules for the {rule.TierName} tier." });
        }

        // ADD THIS DTO right below UpdateLoyaltyRuleDto
    public class CreateLoyaltyRuleDto : UpdateLoyaltyRuleDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string TierName { get; set; } = string.Empty;
    }

    // INSIDE LoyaltyAdminController, add this POST method:
    [HttpPost("rules")]
        public async Task<ActionResult> CreateLoyaltyRule([FromBody] CreateLoyaltyRuleDto request)
        {
            // SE Validations
            if (request.MinimumPoints < 0) return BadRequest("Minimum points cannot be negative.");
            if (request.MaximumPoints.HasValue && request.MaximumPoints <= request.MinimumPoints)
                return BadRequest("Maximum points must be strictly greater than minimum points.");
            if (request.CurrencyAmountPerPoint <= 0) return BadRequest("Currency exchange rate must be greater than zero.");
            if (request.MaxDiscountPercentage < 0 || request.MaxDiscountPercentage > 100) return BadRequest("Discount percentage must be between 0 and 100.");

            var rule = new LoyaltyRule
            {
                TierName = request.TierName,
                MinimumPoints = request.MinimumPoints,
                MaximumPoints = request.MaximumPoints,
                CurrencyAmountPerPoint = request.CurrencyAmountPerPoint,
                MaxRedeemablePointsPerOrder = request.MaxRedeemablePointsPerOrder,
                MaxDiscountPercentage = request.MaxDiscountPercentage,
                PointExpiryDays = request.PointExpiryDays,
                TierEvaluationPeriodDays = request.TierEvaluationPeriodDays,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.LoyaltyRules.Add(rule);
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Successfully created the {rule.TierName} tier." });
        }
    }
}