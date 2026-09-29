using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Loyalty.Models
{
    public class LoyaltyTransaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int LoyaltyAccountId { get; set; }

        [ForeignKey("LoyaltyAccountId")]
        [JsonIgnore]
        public LoyaltyAccount? LoyaltyAccount { get; set; }

        [Required, MaxLength(50)]
        public string TransactionReference { get; set; } = string.Empty; // e.g., LOY-EARN-20260914-000123

        [Required, MaxLength(50)]
        public string TransactionType { get; set; } = string.Empty; // EARNED, REDEEMED, EXPIRED, REVERSED, ADJUSTED

        [Required, MaxLength(50)]
        public string SourceType { get; set; } = string.Empty; // ORDER, MANUAL, SYSTEM, REFERRAL

        public int? SourceId { get; set; } // e.g., OrderId

        // Can be negative for redemptions/expirations. Enforced by service layer.
        [Required]
        public int Points { get; set; } 
        
        [Required]
        public int BalanceBefore { get; set; }
        
        [Required]
        public int BalanceAfter { get; set; }

        [Required, MaxLength(255)]
        public string Reason { get; set; } = string.Empty;

        // Tracks which transaction this reverses to prevent double reversals
        public int? ReversesTransactionId { get; set; }

        [ForeignKey("ReversesTransactionId")]
        [JsonIgnore]
        public LoyaltyTransaction? ReversedTransaction { get; set; }

        public int? CreatedByUserId { get; set; } // Tracks which Admin/Manager did this (if manual)

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}