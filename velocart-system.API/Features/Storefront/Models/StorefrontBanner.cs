using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Storefront.Models
{
    public class StorefrontBanner
    {
        [Key]
        public int Id { get; set; }
        [Required, MaxLength(100)]
        public string Title { get; set; } = string.Empty;
        [Required, MaxLength(200)]
        public string Subtitle { get; set; } = string.Empty;
        [Required, MaxLength(50)]
        public string Discount { get; set; } = string.Empty; // e.g., "20% OFF"
        [Required, MaxLength(50)]
        public string Timer { get; set; } = string.Empty; // e.g., "02:14:36" or "Ongoing"
        [Required, MaxLength(50)]
        public string Label { get; set; } = string.Empty; // e.g., "Flash Deal"
        [Required]
        public string Image { get; set; } = string.Empty; // e.g., "/images/promotions/weekend-fresh.jpg"
        [Required, MaxLength(100)]
        public string Accent { get; set; } = string.Empty; // e.g., "from-orange-500/25 via-transparent to-red-500/20"
        public bool IsActive { get; set; } = true;
    }
}