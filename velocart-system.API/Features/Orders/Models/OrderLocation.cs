using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Orders.Models
{
    public class OrderLocation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        // Store Geographic Coordinates
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        // The human-readable place name (e.g., "Cross Road, Colombo")
        [MaxLength(255)]
        public string PlaceName { get; set; } = string.Empty;

        // When the package was at this location
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}