using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Identity.Models
{
    public class SecurityEvent
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        [JsonIgnore]
        public User? User { get; set; }

        [Required, MaxLength(50)]
        public string EventType { get; set; } = string.Empty; // e.g., "Successful Login", "Password Changed", "Role Changed"

        [Required, MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public int? PerformedByUserId { get; set; } // If a Main Admin made the change

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}