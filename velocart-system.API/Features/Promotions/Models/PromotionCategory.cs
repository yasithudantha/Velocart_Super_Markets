using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Promotions.Models
{
    public class PromotionCategory
    {
        public int PromotionId { get; set; }
        [ForeignKey("PromotionId")]
        public Promotion? Promotion { get; set; }

        public int CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public Category? Category { get; set; }
    }
}