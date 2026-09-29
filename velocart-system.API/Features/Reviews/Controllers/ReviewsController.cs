using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Reviews.Models;
using velocart_system.API.Features.Reviews.DTOs;

namespace velocart_system.API.Features.Reviews.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReviewsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                              
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new UnauthorizedAccessException("Invalid token claims.");
        }

        [HttpPost]
        [Authorize] // STRICT SECURITY: Only logged-in users can post reviews
        public async Task<ActionResult> AddReview([FromBody] CreateReviewDto request)
        {
            int secureUserId = GetSecureUserId();

            var isVerified = await _context.Orders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                .AnyAsync(o => 
                    o.UserId == secureUserId && 
                    o.OrderStatus == "DELIVERED" && 
                    o.Items.Any(i => i.Variant != null && i.Variant.ProductId == request.ProductId));

            if (!isVerified)
            {
                return StatusCode(403, new { message = "You can only review products that have been delivered to you." });
            }

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.UserId == secureUserId && r.ProductId == request.ProductId);
            
            if (existingReview != null) 
                return BadRequest(new { message = "You have already reviewed this product." });

            var review = new Review
            {
                UserId = secureUserId,
                ProductId = request.ProductId,
                Rating = request.Rating,
                Comment = request.Comment,
                IsVerifiedPurchase = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Verified review submitted successfully!" });
        }

        // PUBLIC: Anyone can read reviews, no [Authorize] needed here
        [HttpGet("product/{productId}")]
        public async Task<ActionResult> GetProductReviews(int productId)
        {
            var reviews = await _context.Reviews
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id,
                    r.Rating,
                    r.Comment,
                    r.IsVerifiedPurchase,
                    r.CreatedAt,
                    
                    // Fetch real User's Name
                    UserName = _context.Users.Where(u => u.Id == r.UserId).Select(u => u.FullName).FirstOrDefault() ?? "Anonymous Customer",
                    
                    OrderReference = _context.Orders
                        .Where(o => o.UserId == r.UserId && o.OrderStatus == "DELIVERED" && o.Items.Any(i => i.Variant != null && i.Variant.ProductId == productId))
                        .Select(o => o.OrderNumber)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(reviews);
        }
    }
}