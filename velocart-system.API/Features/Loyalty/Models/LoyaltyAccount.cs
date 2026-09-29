using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Loyalty.Models
{
    public class LoyaltyAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        [JsonIgnore]
        public User? User { get; set; }

        [Required, MaxLength(20)]
        public string LoyaltyIdNumber { get; set; } = string.Empty; 

        // FK to the configurable rule instead of a hardcoded string
        [Required]
        public int CurrentTierRuleId { get; set; }

        [ForeignKey("CurrentTierRuleId")]
        public LoyaltyRule? CurrentTier { get; set; }

        public int TotalPointsEarned { get; set; } = 0;
        public int TotalPointsRedeemed { get; set; } = 0;
        public int CurrentPointsBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalEligibleSpend { get; set; } = 0; 

        [MaxLength(20)]
        public string Status { get; set; } = "ACTIVE"; 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime ExpiryDate { get; set; } 
        public DateTime? LastRenewedAt { get; set; } // Tracks renewal lifecycle

        public List<LoyaltyTransaction> Transactions { get; set; } = new List<LoyaltyTransaction>();
        public List<LoyaltyTierHistory> TierHistories { get; set; } = new List<LoyaltyTierHistory>();
        public List<LoyaltyPointLot> PointLots { get; set; } = new List<LoyaltyPointLot>();
    }
}