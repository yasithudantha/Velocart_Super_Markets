using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.Loyalty.Models
{
    public class LoyaltyRule
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string TierName { get; set; } = string.Empty; // Silver, Gold, Platinum

        public int MinimumPoints { get; set; }
        public int? MaximumPoints { get; set; } // Null for highest tier (e.g., Platinum)

        // E.g., Rs. 100 = 1 Point -> CurrencyAmountPerPoint = 100
        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrencyAmountPerPoint { get; set; }

        public int MaxRedeemablePointsPerOrder { get; set; }
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal MaxDiscountPercentage { get; set; }

        // JSON array of category IDs, or empty for all
        public string EligibleCategoryIds { get; set; } = "[]"; 

        public int PointExpiryDays { get; set; } = 365;
        public int TierEvaluationPeriodDays { get; set; } = 365;

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}