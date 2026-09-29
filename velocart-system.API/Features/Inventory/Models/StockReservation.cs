using System;
using System.ComponentModel.DataAnnotations;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Inventory.Models
{
    public enum ReservationStatus { Active, Consumed, Released }

    public class StockReservation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProductVariantId { get; set; }
        public ProductVariant ProductVariant { get; set; } = null!;

        public int UserId { get; set; } // Customer holding the stock

        [Required]
        public int Quantity { get; set; }

        public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } // Timeout to auto-release stock

        [Required]
        public ReservationStatus Status { get; set; } = ReservationStatus.Active;
    }
}