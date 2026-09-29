using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Loyalty.Models
{
    public class LoyaltyPointLot
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int LoyaltyAccountId { get; set; }

        [ForeignKey("LoyaltyAccountId")]
        [JsonIgnore]
        public LoyaltyAccount? LoyaltyAccount { get; set; }

        [Required]
        public int SourceTransactionId { get; set; }

        [ForeignKey("SourceTransactionId")]
        [JsonIgnore]
        public LoyaltyTransaction? SourceTransaction { get; set; }

        [Required]
        public int OriginalPoints { get; set; }

        [Required]
        public int RemainingPoints { get; set; }

        public bool IsExpired { get; set; } = false;

        public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } 
    }
}