using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Inventory.Models
{
    public class Supplier
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(150)]
        public string ContactEmail { get; set; } = string.Empty;

        [MaxLength(20)]
        public string ContactPhone { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        // Navigation
        public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}