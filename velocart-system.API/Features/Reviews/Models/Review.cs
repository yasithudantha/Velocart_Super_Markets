using System;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Reviews.Models
{
    public class Review
    {
        [Key]
        public int Id { get; set; }
        
        public int ProductId { get; set; }
        public int UserId { get; set; }
        
        [Range(1, 5)]
        public int Rating { get; set; }
        
        [MaxLength(1000)]
        public string Comment { get; set; } = string.Empty;
        
        public bool IsVerifiedPurchase { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}