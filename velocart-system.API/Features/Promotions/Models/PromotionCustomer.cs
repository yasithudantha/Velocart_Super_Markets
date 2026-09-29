using System;
using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Promotions.Models
{
    public class PromotionCustomer
    {
        public int PromotionId { get; set; }
        [ForeignKey("PromotionId")]
        public Promotion? Promotion { get; set; }

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}