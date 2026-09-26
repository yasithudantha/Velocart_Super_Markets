using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Taxes.Models
{
    public class TaxRuleCategory
    {
        public int TaxRuleId { get; set; }
        [ForeignKey("TaxRuleId")]
        public TaxRule? TaxRule { get; set; }

        public int CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public Category? Category { get; set; }
    }
}