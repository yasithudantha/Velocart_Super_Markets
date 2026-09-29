using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace velocart_system.API.Features.Taxes.Models
{
    public class TaxRule
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Standard VAT", "Beverage Tax"

        [Column(TypeName = "decimal(5,2)")]
        public decimal RatePercentage { get; set; }

        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<TaxRuleProduct> TaxRuleProducts { get; set; } = new List<TaxRuleProduct>();
        public List<TaxRuleCategory> TaxRuleCategories { get; set; } = new List<TaxRuleCategory>();
    }
}