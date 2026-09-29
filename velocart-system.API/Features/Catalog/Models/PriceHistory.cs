using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models; // For User context if needed

namespace velocart_system.API.Features.Catalog.Models
{
    public class PriceHistory
    {
        [Key]
        public int Id { get; set; }

        public int ProductVariantId { get; set; }
        
        [ForeignKey("ProductVariantId")]
        [JsonIgnore]
        public ProductVariant? Variant { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OldPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NewPrice { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(150)]
        public string Reason { get; set; } = string.Empty; // e.g., "Supplier cost increased"
    }
}