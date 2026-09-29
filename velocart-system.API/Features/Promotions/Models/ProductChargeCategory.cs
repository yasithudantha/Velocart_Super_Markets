using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Promotions.Models
{
    public class ProductChargeCategory
    {
        public int ProductChargeId { get; set; }
        [ForeignKey("ProductChargeId")]
        public ProductCharge? ProductCharge { get; set; }

        public int CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public Category? Category { get; set; }
    }
}