using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Models
{
    public class ProductVariant
    {
        [Key]
        public int Id { get; set; }

        public int ProductId { get; set; }
        
        [ForeignKey("ProductId")]
        [JsonIgnore]
        public Product? Product { get; set; }

        [Required, MaxLength(50)]
        public string SKU { get; set; } = string.Empty; // Stock Keeping Unit

        [Required, MaxLength(50)]
        public string WeightOrSize { get; set; } = string.Empty; // e.g., "500ml", "1kg"

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public int StockQuantity { get; set; } // Stock availability

        public DateTime? ExpiryDate { get; set; } // Expiry information

        public bool IsActive { get; set; } = true;

        // ADD THESE NEW PROPERTIES TO YOUR EXISTING ProductVariant CLASS:

// Holds stock temporarily while in checkout to prevent overselling
public int ReservedQuantity { get; set; } = 0; 

// Base cost price (average or latest) for dashboard valuation
public decimal CostPrice { get; set; } = 0.00m; 

// Navigation for Batches and POs
public ICollection<velocart_system.API.Features.Inventory.Models.ProductBatch> Batches { get; set; } = new List<velocart_system.API.Features.Inventory.Models.ProductBatch>();
    }
}