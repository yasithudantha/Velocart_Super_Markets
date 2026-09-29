using System;
using System.ComponentModel.DataAnnotations;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Inventory.Models
{
    public class ProductBatch
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProductVariantId { get; set; }
        public ProductVariant ProductVariant { get; set; } = null!;

        [Required, MaxLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        public DateTime ManufacturingDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;

        [Required]
        public int InitialQuantity { get; set; }

        [Required]
        public int CurrentQuantity { get; set; } // Deducted as sales happen (FEFO)

        [Required]
        public decimal CostPrice { get; set; } // Used for Inventory Valuation
    }
}