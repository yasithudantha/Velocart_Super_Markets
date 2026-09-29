using System.ComponentModel.DataAnnotations;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Inventory.Models
{
    public class SupplierProduct
    {
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;

        public int ProductVariantId { get; set; }
        public ProductVariant ProductVariant { get; set; } = null!;

        [MaxLength(50)]
        public string SupplierProductCode { get; set; } = string.Empty;

        [Required]
        public decimal AgreedPurchasePrice { get; set; }

        [Required]
        public int MinimumOrderQuantity { get; set; } = 1;

        [Required]
        public int LeadTimeDays { get; set; } = 7;
    }
}