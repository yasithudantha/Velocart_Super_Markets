using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Inventory.Models
{
    public class GoodsReceipt
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int PurchaseOrderId { get; set; }
        public PurchaseOrder PurchaseOrder { get; set; } = null!;

        public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
        
        [MaxLength(255)]
        public string ReceivedBy { get; set; } = string.Empty; 
        
        public string Notes { get; set; } = string.Empty;

        public ICollection<GoodsReceiptItem> Items { get; set; } = new List<GoodsReceiptItem>();
    }
}