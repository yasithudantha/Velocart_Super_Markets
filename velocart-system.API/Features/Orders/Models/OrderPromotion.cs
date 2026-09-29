using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Features.Orders.Models
{
    public class OrderPromotion
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }
        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        // Nullable because the original promotion might be deleted in the future
        public int? OriginalPromotionId { get; set; }

        [Required, MaxLength(150)]
        public string PromotionNameSnapshot { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string PromotionTypeSnapshot { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountApplied { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}