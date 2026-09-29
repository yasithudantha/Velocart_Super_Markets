using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Inventory.Models
{
    public enum POStatus
    {
        Placed,
        PartiallyReceived,
        Received,
        Cancelled
    }

    public class PurchaseOrder
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public DateTime ExpectedDeliveryDate { get; set; }

        [Required]
        public POStatus Status { get; set; } = POStatus.Placed;

        public decimal TotalAmount { get; set; }

        // Navigation
        public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    }
}