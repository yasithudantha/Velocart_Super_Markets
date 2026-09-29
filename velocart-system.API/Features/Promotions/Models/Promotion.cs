using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.Promotions.Models
{
    public class Promotion
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public PromotionType Type { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, ACTIVE, EXPIRED, INACTIVE

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // General Discount Value (Percentage or Fixed Amount)
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountValue { get; set; }

        // Minimum Spend Threshold
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MinimumSpend { get; set; }

        // BOGO & Buy X Get Y Rules
        public int? BuyQuantityX { get; set; }
        public int? GetQuantityY { get; set; }
        public int? RewardProductId { get; set; } // The specific free/reward product

        // Targeting Identifiers
        public bool IsLoyaltyPromotion { get; set; } = false;

        [MaxLength(100)]
        public string? TargetBrand { get; set; } // For Brand Discounts

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // --- Relational Mappings ---
        public List<PromotionProduct> PromotionProducts { get; set; } = new List<PromotionProduct>();
        public List<PromotionCategory> PromotionCategories { get; set; } = new List<PromotionCategory>();
        public List<PromotionLoyaltyRule> PromotionLoyaltyRules { get; set; } = new List<PromotionLoyaltyRule>();
        public List<PromotionCustomer> PromotionCustomers { get; set; } = new List<PromotionCustomer>();
        public List<PromotionTier> PromotionTiers { get; set; } = new List<PromotionTier>();
    }
}