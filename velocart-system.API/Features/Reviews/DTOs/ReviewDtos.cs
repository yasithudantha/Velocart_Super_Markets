using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Reviews.DTOs
{
    public class CreateReviewDto
    {
        [Required]
        public int ProductId { get; set; }
        
        [Range(1, 5)]
        public int Rating { get; set; }
        
        public string Comment { get; set; } = string.Empty;
    }
}