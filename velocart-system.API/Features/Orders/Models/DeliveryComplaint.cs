using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Orders.Models
{
    public class DeliveryComplaint
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [ForeignKey("CustomerId")]
        [JsonIgnore]
        public User? Customer { get; set; }

        [Required, MaxLength(150)]
        public string Subject { get; set; } = string.Empty; // e.g., "Order not received", "Damaged items"

        [Required, MaxLength(2000)]
        public string Description { get; set; } = string.Empty;

        // NEW: Store the uploaded image URL
        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        public string Status { get; set; } = "OPEN"; // OPEN, INVESTIGATING, RESOLVED

        [Column(TypeName = "decimal(18,2)")]
        public decimal RefundAmount { get; set; } = 0;
        
        public int CompensatoryPoints { get; set; } = 0;
        
        public string? ResolutionNotes { get; set; }

        // --- NEW: REFUND LIFECYCLE FIELDS ---
        [MaxLength(50)]
        public string RefundStatus { get; set; } = "None"; // None, Pending_Customer_Choice, Processing, Completed

        [MaxLength(50)]
        public string? RefundMethod { get; set; } // OriginalPayment, LoyaltyPoints

        [MaxLength(100)]
        public string? RefundReceiptNumber { get; set; }

        public DateTime? RefundProcessedAt { get; set; }
        // ------------------------------------

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}