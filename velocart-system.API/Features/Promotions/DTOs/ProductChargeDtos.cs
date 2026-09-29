using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Promotions.DTOs
{
    public class CreateProductChargeDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string ChargeType { get; set; } = "FIXED"; // FIXED or PERCENTAGE

        [Required]
        public decimal AmountOrPercentage { get; set; }

        public decimal MinOrderAmount { get; set; } = 0;
        public decimal? MaxOrderAmount { get; set; }

        public bool IsActive { get; set; } = true;
    }
}