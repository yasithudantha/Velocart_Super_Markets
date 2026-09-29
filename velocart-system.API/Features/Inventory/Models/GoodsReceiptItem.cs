using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Inventory.Models
{
    public class GoodsReceiptItem
    {
        [Key]
        public int Id { get; set; }
        
        public int GoodsReceiptId { get; set; }
        public GoodsReceipt GoodsReceipt { get; set; } = null!;

        public int PurchaseOrderItemId { get; set; }
        public PurchaseOrderItem PurchaseOrderItem { get; set; } = null!;

        [Required]
        public int QuantityReceived { get; set; }
        
        [Required]
        public int QuantityRejected { get; set; } = 0; 
        
        [MaxLength(255)]
        public string RejectionReason { get; set; } = string.Empty;
    }
}