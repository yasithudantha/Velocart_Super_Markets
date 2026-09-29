using System.ComponentModel.DataAnnotations.Schema;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Promotions.Models
{
    public class ProductChargeProduct
    {
        public int ProductChargeId { get; set; }
        [ForeignKey("ProductChargeId")]
        public ProductCharge? ProductCharge { get; set; }

        public int ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product? Product { get; set; }
    }
}