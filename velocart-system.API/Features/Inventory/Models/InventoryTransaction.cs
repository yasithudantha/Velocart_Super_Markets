using System;
using System.ComponentModel.DataAnnotations;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Inventory.Models
{
    public enum TransactionType { Received, Sold, Adjusted_Up, Adjusted_Down, Expired, Damaged, Returned }

    public class InventoryTransaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProductVariantId { get; set; }
        public ProductVariant ProductVariant { get; set; } = null!;

        public int? ProductBatchId { get; set; } // Nullable if transaction isn't batch-specific

        [Required]
        public TransactionType Type { get; set; }

        [Required]
        public int QuantityChanged { get; set; } // + or -

        [Required]
        public int QuantityBefore { get; set; }

        [Required]
        public int QuantityAfter { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [MaxLength(255)]
        public string ReferenceDocument { get; set; } = string.Empty; // e.g., "PO-1002", "ORDER-409", "MANUAL-ADJ"
        
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }
}