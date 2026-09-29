using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.Promotions.Models
{
    public class PromotionTier
    {
        [Key]
        public int Id { get; set; }

        public int PromotionId { get; set; }
        [ForeignKey("PromotionId")]
        public Promotion? Promotion { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumSpendAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountValue { get; set; } // The percentage or fixed amount for this specific tier
    }
}