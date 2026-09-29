using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
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
    public class PromotionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PromotionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult> CreatePromotion([FromBody] CreatePromotionDto request)
        {
            // FIX: Ensure UTC Conversion
            var startUtc = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc);

            if (endUtc <= startUtc) return BadRequest("End date must be after the start date.");
            if (!Enum.TryParse(request.Type, out PromotionType parsedType)) return BadRequest("Invalid Promotion Type.");

            string initialStatus;
            if (endUtc < DateTime.UtcNow) initialStatus = "EXPIRED";
            else if (startUtc <= DateTime.UtcNow) initialStatus = "ACTIVE";
            else initialStatus = "SCHEDULED";

            var promotion = new Promotion
            {
                Name = request.Name, Description = request.Description, Type = parsedType, Status = initialStatus,
                StartDate = startUtc, EndDate = endUtc, DiscountValue = request.DiscountValue,
                MinimumSpend = request.MinimumSpend, BuyQuantityX = request.BuyQuantityX, GetQuantityY = request.GetQuantityY,
                RewardProductId = request.RewardProductId, IsLoyaltyPromotion = request.IsLoyaltyPromotion, TargetBrand = request.TargetBrand
            };

            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();

            if (request.ProductIds.Any()) _context.PromotionProducts.AddRange(request.ProductIds.Select(pid => new PromotionProduct { PromotionId = promotion.Id, ProductId = pid }));
            if (request.CategoryIds.Any()) _context.PromotionCategories.AddRange(request.CategoryIds.Select(cid => new PromotionCategory { PromotionId = promotion.Id, CategoryId = cid }));
            if (request.IsLoyaltyPromotion && request.LoyaltyRuleIds.Any()) _context.PromotionLoyaltyRules.AddRange(request.LoyaltyRuleIds.Select(rid => new PromotionLoyaltyRule { PromotionId = promotion.Id, LoyaltyRuleId = rid }));

            await _context.SaveChangesAsync();
            return Ok(new { message = "Promotion created successfully.", promotionId = promotion.Id });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdatePromotion(int id, [FromBody] CreatePromotionDto request)
        {
            var promotion = await _context.Promotions
                .Include(p => p.PromotionProducts)
                .Include(p => p.PromotionCategories)
                .Include(p => p.PromotionLoyaltyRules)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (promotion == null) return NotFound("Promotion not found.");

            // FIX: Ensure UTC Conversion
            var startUtc = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc);

            if (endUtc <= startUtc) return BadRequest("End date must be after the start date.");
            if (!Enum.TryParse(request.Type, out PromotionType parsedType)) return BadRequest("Invalid Promotion Type.");

            promotion.Name = request.Name; promotion.Description = request.Description; promotion.Type = parsedType;
            promotion.StartDate = startUtc; promotion.EndDate = endUtc; promotion.DiscountValue = request.DiscountValue;
            promotion.MinimumSpend = request.MinimumSpend; promotion.BuyQuantityX = request.BuyQuantityX; promotion.GetQuantityY = request.GetQuantityY; promotion.RewardProductId = request.RewardProductId;
            promotion.TargetBrand = request.TargetBrand; promotion.IsLoyaltyPromotion = request.IsLoyaltyPromotion;
            
            if (endUtc < DateTime.UtcNow) promotion.Status = "EXPIRED";
            else if (startUtc <= DateTime.UtcNow) promotion.Status = "ACTIVE";
            else promotion.Status = "SCHEDULED";
            
            promotion.UpdatedAt = DateTime.UtcNow;

            _context.PromotionProducts.RemoveRange(promotion.PromotionProducts);
            _context.PromotionCategories.RemoveRange(promotion.PromotionCategories);
            _context.PromotionLoyaltyRules.RemoveRange(promotion.PromotionLoyaltyRules);

            if (request.ProductIds.Any()) _context.PromotionProducts.AddRange(request.ProductIds.Select(pid => new PromotionProduct { PromotionId = promotion.Id, ProductId = pid }));
            if (request.CategoryIds.Any()) _context.PromotionCategories.AddRange(request.CategoryIds.Select(cid => new PromotionCategory { PromotionId = promotion.Id, CategoryId = cid }));
            if (request.IsLoyaltyPromotion && request.LoyaltyRuleIds.Any()) _context.PromotionLoyaltyRules.AddRange(request.LoyaltyRuleIds.Select(rid => new PromotionLoyaltyRule { PromotionId = promotion.Id, LoyaltyRuleId = rid }));

            await _context.SaveChangesAsync();
            return Ok(new { message = "Promotion updated successfully." });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PromotionResponseDto>>> GetAllPromotions()
        {
            var promotions = await _context.Promotions
                .Include(p => p.PromotionProducts).Include(p => p.PromotionCategories).Include(p => p.PromotionLoyaltyRules)
                .OrderByDescending(p => p.CreatedAt).ToListAsync();

            var result = promotions.Select(p => new PromotionResponseDto {  
                Id = p.Id, Name = p.Name, Description = p.Description, Type = p.Type.ToString(), Status = p.Status,
                StartDate = p.StartDate, EndDate = p.EndDate, DiscountValue = p.DiscountValue, IsLoyaltyPromotion = p.IsLoyaltyPromotion,
                MinimumSpend = p.MinimumSpend, BuyQuantityX = p.BuyQuantityX, GetQuantityY = p.GetQuantityY,
                RewardProductId = p.RewardProductId, TargetBrand = p.TargetBrand,
                ApplicableProductIds = p.PromotionProducts.Select(pp => pp.ProductId).ToList(),
                ApplicableCategoryIds = p.PromotionCategories.Select(pc => pc.CategoryId).ToList(),
                ApplicableLoyaltyRuleIds = p.PromotionLoyaltyRules.Select(plr => plr.LoyaltyRuleId).ToList()
            });

            return Ok(result);
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdatePromotionStatus(int id, [FromBody] UpdatePromotionStatusDto request)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found.");
            promotion.Status = request.Status;
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Promotion status updated to {request.Status}." });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePromotion(int id)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found.");
            _context.Promotions.Remove(promotion);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Promotion successfully deleted." });
        }

        [HttpPost("{id}/assign")]
        public async Task<ActionResult> AssignPromotionToCustomer(int id, [FromBody] AssignPromotionDto request)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found.");

            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.CustomerId && u.Role == "CUSTOMER");
            if (customer == null) return NotFound("Customer not found.");

            if (await _context.PromotionCustomers.AnyAsync(pc => pc.PromotionId == id && pc.UserId == request.CustomerId))
                return BadRequest("This promotion is already assigned to this customer.");

            _context.PromotionCustomers.Add(new PromotionCustomer { PromotionId = id, UserId = request.CustomerId });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Promotion successfully gifted to {customer.FullName}." });
        }

        [HttpGet("loyalty-tiers")]
        public async Task<ActionResult> GetLoyaltyTiers()
        {
            var tiers = await _context.LoyaltyRules.Select(r => new { r.Id, r.TierName }).ToListAsync();
            return Ok(tiers);
        }
    }
}