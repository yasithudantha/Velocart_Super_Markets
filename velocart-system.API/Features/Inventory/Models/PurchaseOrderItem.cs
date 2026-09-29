using System.ComponentModel.DataAnnotations;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Inventory.Models
{
    public class PurchaseOrderItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PurchaseOrderId { get; set; }
        public PurchaseOrder PurchaseOrder { get; set; } = null!;

        [Required]
        public int ProductVariantId { get; set; }
        public ProductVariant ProductVariant { get; set; } = null!;

        [Required, Range(1, int.MaxValue)]
        public int OrderedQuantity { get; set; }

        [Required, Range(0, int.MaxValue)]
        public int ReceivedQuantity { get; set; } = 0; // Enables Partial Receiving

        [Required]
        public decimal PurchasePrice { get; set; } // Supplier Price

        public DateTime? ExpectedDeliveryDate { get; set; }
    }
}