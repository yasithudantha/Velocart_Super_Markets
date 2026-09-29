using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Loyalty.Models
{
    public class LoyaltyTierHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int LoyaltyAccountId { get; set; }

        [ForeignKey("LoyaltyAccountId")]
        [JsonIgnore]
        public LoyaltyAccount? LoyaltyAccount { get; set; }

        [Required, MaxLength(50)]
        public string PreviousTierName { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string NewTierName { get; set; } = string.Empty;

        [Required, MaxLength(255)]
        public string Reason { get; set; } = string.Empty; // e.g., "Annual Review Downgrade", "Points Threshold Reached"

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}