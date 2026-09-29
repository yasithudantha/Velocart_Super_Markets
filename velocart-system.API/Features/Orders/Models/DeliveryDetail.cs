using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Orders.Models
{
    public class DeliveryDetail
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        [MaxLength(100)]
        public string DeliveryNumber { get; set; } = string.Empty; // e.g., DEL-2026-8923

        public DateTime? EstimatedDeliveryDate { get; set; }
        
        [MaxLength(50)]
        public string EstimatedDeliveryTime { get; set; } = string.Empty; // e.g., "14:00 - 16:00"

        [MaxLength(200)]
        public string AssignedDriverName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string AssignedDriverContact { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string DeliveryNotes { get; set; } = string.Empty;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}