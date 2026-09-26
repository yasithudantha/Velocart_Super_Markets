using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Taxes.Models;
using velocart_system.API.Features.Taxes.DTOs;

public class BulkTaxMappingDto
    {
        public int ProductId { get; set; }
        public int TaxRuleId { get; set; }
        public string Justification { get; set; } = string.Empty; // From the AI
    }

namespace velocart_system.API.Features.Taxes.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")] 
    public class TaxesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TaxesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult> CreateTaxRule([FromBody] CreateTaxRuleDto request)
        {
            // FIX: Ensure UTC Conversion
            var startUtc = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc);
            DateTime? endUtc = request.EndDate.HasValue ? DateTime.SpecifyKind(request.EndDate.Value, DateTimeKind.Utc) : null;

            var taxRule = new TaxRule
            {
                Name = request.Name,
                RatePercentage = request.RatePercentage,
                StartDate = startUtc,
                EndDate = endUtc
            };

            _context.TaxRules.Add(taxRule);
            await _context.SaveChangesAsync(); 

            if (request.ProductIds.Any()) _context.TaxRuleProducts.AddRange(request.ProductIds.Select(pid => new TaxRuleProduct { TaxRuleId = taxRule.Id, ProductId = pid }));
            if (request.CategoryIds.Any()) _context.TaxRuleCategories.AddRange(request.CategoryIds.Select(cid => new TaxRuleCategory { TaxRuleId = taxRule.Id, CategoryId = cid }));

            await _context.SaveChangesAsync();
            return Ok(new { message = "Tax rule created successfully.", taxRuleId = taxRule.Id });
        }

        [HttpGet]
        public async Task<ActionResult> GetTaxRules()
        {
            var rules = await _context.TaxRules
                .Include(t => t.TaxRuleProducts)
                .Include(t => t.TaxRuleCategories)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new {
                    t.Id, t.Name, t.RatePercentage, t.StartDate, t.EndDate, t.IsActive,
                    ProductIds = t.TaxRuleProducts.Select(tp => tp.ProductId).ToList(),
                    CategoryIds = t.TaxRuleCategories.Select(tc => tc.CategoryId).ToList()
                }).ToListAsync();
                
            return Ok(rules);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTaxRule(int id)
        {
            var rule = await _context.TaxRules.FindAsync(id);
            if (rule == null) return NotFound("Tax rule not found.");
            
            _context.TaxRules.Remove(rule);
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Tax rule successfully deleted." });
        }

        // AI INTEGRATION: Execute bulk tax mappings
        [HttpPost("bulk-map")]
        public async Task<ActionResult> BulkMapTaxes([FromBody] System.Collections.Generic.List<BulkTaxMappingDto> mappings)
        {
            if (mappings == null || !mappings.Any()) return BadRequest("No mappings provided.");

            var newMappings = mappings.Select(m => new TaxRuleProduct
            {
                ProductId = m.ProductId,
                TaxRuleId = m.TaxRuleId
            }).ToList();

            _context.TaxRuleProducts.AddRange(newMappings);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Successfully mapped {newMappings.Count} products to legal tax rules." });
        }
    }
}