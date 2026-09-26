using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Taxes.Models
{
    public class TaxRuleProduct
    {
        public int TaxRuleId { get; set; }
        [ForeignKey("TaxRuleId")]
        public TaxRule? TaxRule { get; set; }

        public int ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product? Product { get; set; }
    }
}