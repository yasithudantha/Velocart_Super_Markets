using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using velocart_system.API.Data;

namespace velocart_system.API.Features.AgenticAI.Controllers
{
    public class ChatRequestDto { public string Message { get; set; } = string.Empty; }

    [Route("api/[controller]")]
    [ApiController]
    public class CustomerAgentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory; // FIX 6: Best Practice for HTTP

        public CustomerAgentController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        // Helper to securely get User ID from Token
        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new UnauthorizedAccessException("Invalid token claims.");
        }

        // ==============================================================
        // 1. CHAT RELAY ENDPOINT (React -> C# -> Python)
        // ==============================================================
        [HttpPost("chat")]
        [Authorize] 
        public async Task<ActionResult> SendChatMessage([FromBody] ChatRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Message)) return BadRequest("Message cannot be empty.");

            int userId;
            try { userId = GetSecureUserId(); }
            catch (UnauthorizedAccessException) { return Unauthorized("Invalid token claims."); }

            // FIX 6: Use Factory to prevent Socket Exhaustion
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(2);

            try
            {
                var payload = new { userId = userId, message = request.Message };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var aiUrl = Environment.GetEnvironmentVariable("AIServiceUrl") ?? "http://127.0.0.1:8000";
                var response = await client.PostAsync($"{aiUrl}/customer-chat", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    return Content(responseString, "application/json"); 
                }
                
                return StatusCode(500, "The AI Shopping Assistant is currently unavailable.");
            }
            catch (Exception)
            {
                // FIX 5: Hide raw exception message from the client
                return StatusCode(500, "Failed to connect to internal AI Service.");
            }
        }

        // ==============================================================
        // 2. READ-ONLY TOOL: GET CUSTOMER CONTEXT (Internal AI Tool)
        // ==============================================================
        [HttpGet("context/{userId}")]
        [AllowAnonymous] // Allowed for internal Python Microservice
        public async Task<ActionResult> GetCustomerContext(int userId)
        {
            var cart = await _context.ShoppingCarts
                .Include(c => c.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            var loyalty = await _context.LoyaltyAccounts
                .Include(l => l.CurrentTier)
                .FirstOrDefaultAsync(l => l.UserId == userId);

            var context = new
            {
                UserId = userId,
                LoyaltyTier = loyalty?.CurrentTier?.TierName ?? "Standard",
                AvailablePoints = loyalty?.CurrentPointsBalance ?? 0,
                CartItems = cart == null
                    ? new List<object>()
                    : cart.Items.Select(i => (object)new
                    {
                        CartItemId = i.Id,
                        ProductVariantId = i.ProductVariantId,
                        ProductName = i.Variant?.Product?.Name,
                        VariantSize = i.Variant?.WeightOrSize,
                        Quantity = i.Quantity,
                        UnitPrice = i.Variant?.Price ?? 0,
                        TotalPrice = (i.Variant?.Price ?? 0) * i.Quantity
                    }).ToList()
            };

            return Ok(context);
        }

        // ==============================================================
        // 3. READ-ONLY TOOL: SEARCH CATALOG (Python searches C#)
        // ==============================================================
        [HttpGet("search")]
        [AllowAnonymous] // FIX 4: Explicitly allowed. Product info is public data.
        public async Task<ActionResult> SearchCatalog([FromQuery] string query, [FromQuery] decimal? maxPrice)
        {
            if (string.IsNullOrWhiteSpace(query)) return BadRequest("Query required.");

            var term = query.Trim().ToLower();

            var productsQuery = _context.ProductVariants
                .Include(v => v.Product).ThenInclude(p => p!.Category)
                .Where(v => v.IsActive && v.Product != null && v.Product.IsActive && (v.StockQuantity - v.ReservedQuantity) > 0)
                .Where(v => v.Product!.Name.ToLower().Contains(term) || 
                            v.Product.Brand.ToLower().Contains(term) || 
                            (v.Product.Category != null && v.Product.Category.Name.ToLower().Contains(term)) ||
                            v.WeightOrSize.ToLower().Contains(term));

            if (maxPrice.HasValue)
            {
                productsQuery = productsQuery.Where(v => v.Price <= maxPrice.Value);
            }

            var results = await productsQuery
                .Select(v => new {
                    ProductVariantId = v.Id,
                    ProductName = v.Product!.Name,
                    Brand = v.Product.Brand,
                    VariantName = v.WeightOrSize,
                    Price = v.Price,
                    AvailableStock = v.StockQuantity - v.ReservedQuantity
                })
                .Take(8) 
                .ToListAsync();

            if (!results.Any()) return Ok(new { message = "No matching products found in stock." });

            return Ok(results);
        }
    }
}