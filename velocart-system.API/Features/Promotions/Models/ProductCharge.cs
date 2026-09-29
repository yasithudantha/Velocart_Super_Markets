using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.Promotions.Models
{
    public class ProductCharge
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Fragile Packaging Fee"

        [Required, MaxLength(20)]
        public string ChargeType { get; set; } = "FIXED"; // FIXED, PERCENTAGE

        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountOrPercentage { get; set; }

        // NEW: Order Total Range Rules
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinOrderAmount { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MaxOrderAmount { get; set; } // Null means infinity

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }
}