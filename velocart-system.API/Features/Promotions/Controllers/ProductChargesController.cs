using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Promotions.Models;
using velocart_system.API.Features.Promotions.DTOs;

namespace velocart_system.API.Features.Promotions.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "PROMOTIONMANAGER,ADMIN")]
    public class ProductChargesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProductChargesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult> CreateCharge([FromBody] CreateProductChargeDto request)
        {
            var charge = new ProductCharge
            {
                Name = request.Name,
                ChargeType = request.ChargeType,
                AmountOrPercentage = request.AmountOrPercentage,
                MinOrderAmount = request.MinOrderAmount,
                MaxOrderAmount = request.MaxOrderAmount,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProductCharges.Add(charge);
            await _context.SaveChangesAsync(); 
            return Ok(new { message = "Fee created successfully." });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateCharge(int id, [FromBody] CreateProductChargeDto request)
        {
            var charge = await _context.ProductCharges.FirstOrDefaultAsync(c => c.Id == id);
            if (charge == null) return NotFound("Fee not found.");

            charge.Name = request.Name;
            charge.ChargeType = request.ChargeType;
            charge.AmountOrPercentage = request.AmountOrPercentage;
            charge.MinOrderAmount = request.MinOrderAmount;
            charge.MaxOrderAmount = request.MaxOrderAmount;
            charge.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Fee updated successfully." });
        }

        [HttpGet]
        public async Task<ActionResult> GetCharges()
        {
            var charges = await _context.ProductCharges
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id, c.Name, c.ChargeType, c.AmountOrPercentage, 
                    c.MinOrderAmount, c.MaxOrderAmount, c.IsActive
                }).ToListAsync();
                
            return Ok(charges);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCharge(int id)
        {
            var charge = await _context.ProductCharges.FindAsync(id);
            if (charge == null) return NotFound("Fee not found.");
            
            _context.ProductCharges.Remove(charge);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Fee successfully deleted." });
        }
    }
}