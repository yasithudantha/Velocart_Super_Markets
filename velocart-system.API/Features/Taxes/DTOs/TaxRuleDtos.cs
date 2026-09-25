using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Taxes.DTOs
{
    public class CreateTaxRuleDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal RatePercentage { get; set; }

        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }

        public List<int> ProductIds { get; set; } = new List<int>();
        public List<int> CategoryIds { get; set; } = new List<int>();
    }
}