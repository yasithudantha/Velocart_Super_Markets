using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Features.Loyalty.Models;

namespace velocart_system.API.Features.Promotions.Models
{
    public class PromotionLoyaltyRule
    {
        public int PromotionId { get; set; }
        [ForeignKey("PromotionId")]
        public Promotion? Promotion { get; set; }

        public int LoyaltyRuleId { get; set; }
        [ForeignKey("LoyaltyRuleId")]
        public LoyaltyRule? LoyaltyRule { get; set; }
    }
}