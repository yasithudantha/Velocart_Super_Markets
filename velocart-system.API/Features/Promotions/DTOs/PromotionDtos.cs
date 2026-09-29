using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Promotions.DTOs
{
    public class CreatePromotionDto
    {
        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public decimal DiscountValue { get; set; }
        public decimal? MinimumSpend { get; set; }

        public int? BuyQuantityX { get; set; }
        public int? GetQuantityY { get; set; }
        public int? RewardProductId { get; set; }

        public bool IsLoyaltyPromotion { get; set; } = false;
        public string? TargetBrand { get; set; }

        public List<int> ProductIds { get; set; } = new List<int>();
        public List<int> CategoryIds { get; set; } = new List<int>();
        public List<int> LoyaltyRuleIds { get; set; } = new List<int>();
    }

    public class PromotionResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal DiscountValue { get; set; }
        public bool IsLoyaltyPromotion { get; set; }
        
        // FIX: Added missing fields for Edit mode (Issue 2)
        public decimal? MinimumSpend { get; set; }
        public int? BuyQuantityX { get; set; }
        public int? GetQuantityY { get; set; }
        public int? RewardProductId { get; set; }
        public string? TargetBrand { get; set; }

        public List<int> ApplicableProductIds { get; set; } = new List<int>();
        public List<int> ApplicableCategoryIds { get; set; } = new List<int>();
        public List<int> ApplicableLoyaltyRuleIds { get; set; } = new List<int>();
    }

    public class UpdatePromotionStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    // NEW: DTO for assigning a promotion to a customer (SRS 7.5)
    public class AssignPromotionDto
    {
        [Required]
        public int CustomerId { get; set; }
    }
}