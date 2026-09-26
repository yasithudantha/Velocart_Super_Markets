using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;

namespace velocart_system.API.Features.AgenticAI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CatalogComplianceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CatalogComplianceController(ApplicationDbContext context)
        {
            _context = context;
        }

        // TOOL 1 (Agent 1): Find products with no taxes applied
        [HttpGet("unmapped-products")]
        public async Task<ActionResult> GetUnmappedProducts()
        {
            // 1. Get IDs of all products that already have a tax rule
            var mappedProductIds = await _context.TaxRuleProducts
                .Select(tp => tp.ProductId)
                .Distinct()
                .ToListAsync();

            // 2. Find active products that are NOT in that list
            var unmappedProducts = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants) // Needed for Agent 3's Impact Simulator
                .Where(p => p.IsActive && !mappedProductIds.Contains(p.Id))
                .Select(p => new
                {
                    ProductId = p.Id,
                    ProductName = p.Name,
                    Brand = p.Brand,
                    Description = p.Description,
                    CategoryName = p.Category != null ? p.Category.Name : "Uncategorized",
                    // Grab the lowest variant price to simulate the tax impact
                    BasePrice = p.Variants.Any() ? p.Variants.Min(v => v.Price) : 0 
                })
                .Take(5)
                .ToListAsync();

            if (!unmappedProducts.Any())
                return Ok(new { message = "All products are 100% tax compliant. No unmapped products found." });

            return Ok(unmappedProducts);
        }

        // TOOL 2 (Agent 2): Get available Tax Rules to choose from
        [HttpGet("active-taxes")]
        public async Task<ActionResult> GetActiveTaxes()
        {
            var taxes = await _context.TaxRules
                .Where(t => t.IsActive)
                .Select(t => new { t.Id, t.Name, t.RatePercentage })
                .ToListAsync();

            return Ok(taxes);
        }
    }
}