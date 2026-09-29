using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Catalog.DTOs;
using velocart_system.API.Features.Promotions.Models;

namespace velocart_system.API.Features.Catalog.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CatalogController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CatalogController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories()
        {
            var categories = await _context.Categories
                .Where(c => c.ParentCategoryId == null)
                .Include(c => c.SubCategories)
                .ThenInclude(sc => sc.SubCategories)
                .ToListAsync();

            var categoryDtos = categories.Select(MapToCategoryDto).ToList();
            return Ok(categoryDtos);
        }

        [HttpGet("products")]
        public async Task<ActionResult<IEnumerable<ProductResponseDto>>> GetProducts(
            [FromQuery] int? categoryId, [FromQuery] string? search, [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice, [FromQuery] string? brand, [FromQuery] bool? inStockOnly, [FromQuery] string? sortBy)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .AsSplitQuery() 
                .Where(p => p.IsActive);

            if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                var synonyms = new Dictionary<string, string> { { "soda", "beverage" }, { "cocacola", "coca-cola" } };
                if (synonyms.ContainsKey(term)) term = synonyms[term];

                query = query.Where(p => 
                    p.Name.ToLower().Contains(term) || p.Brand.ToLower().Contains(term) ||
                    (p.Category != null && p.Category.Name.ToLower().Contains(term)) ||
                    p.Variants.Any(v => v.SKU.ToLower().Contains(term))
                );
            }

            if (!string.IsNullOrWhiteSpace(brand)) query = query.Where(p => p.Brand.ToLower().Contains(brand.Trim().ToLower()));
            if (minPrice.HasValue) query = query.Where(p => p.Variants.Any(v => v.Price >= minPrice.Value));
            if (maxPrice.HasValue) query = query.Where(p => p.Variants.Any(v => v.Price <= maxPrice.Value));
            if (inStockOnly == true) query = query.Where(p => p.Variants.Any(v => v.StockQuantity > 0));

            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                switch (sortBy.ToLower())
                {
                    case "price_asc": query = query.OrderBy(p => p.Variants.Min(v => v.Price)); break;
                    case "price_desc": query = query.OrderByDescending(p => p.Variants.Max(v => v.Price)); break;
                    case "newest": query = query.OrderByDescending(p => p.CreatedAt); break;
                }
            }
            else query = query.OrderByDescending(p => p.CreatedAt);

            var products = await query.ToListAsync();
            var now = DateTime.UtcNow;
            var activePromotions = await _context.Promotions
                .Include(p => p.PromotionProducts)
                .Include(p => p.PromotionCategories)
                .Where(promo => promo.Status == "ACTIVE" && promo.StartDate <= now && promo.EndDate >= now)
                .ToListAsync();

            var productDtos = products.Select(p => new ProductResponseDto
            {
                Id = p.Id, Name = p.Name, Brand = p.Brand, Description = p.Description, CategoryId = p.CategoryId, CategoryName = p.Category?.Name ?? string.Empty, IsActive = p.IsActive,
                Variants = p.Variants.Select(v => 
                {
                    decimal originalPrice = v.Price;
                    decimal? discountedPrice = null;
                    string? discountLabel = null;
                    decimal highestDiscountValue = 0;

                    foreach(var promo in activePromotions)
                    {
                        // FIX: Scoped to 'p' (Product)
                        bool isEligible = (!promo.PromotionProducts.Any() && !promo.PromotionCategories.Any() && string.IsNullOrEmpty(promo.TargetBrand)) || 
                                          promo.PromotionProducts.Any(pp => pp.ProductId == p.Id) || 
                                          promo.PromotionCategories.Any(pc => pc.CategoryId == p.CategoryId) || 
                                          (!string.IsNullOrEmpty(promo.TargetBrand) && string.Equals(promo.TargetBrand, p.Brand, StringComparison.OrdinalIgnoreCase));

                        if (isEligible)
                        {
                            decimal currentDiscount = 0;
                            string currentLabel = string.Empty;

                            if (promo.Type == PromotionType.PERCENTAGE_DISCOUNT) { currentDiscount = originalPrice * (promo.DiscountValue / 100m); currentLabel = $"{promo.DiscountValue}% OFF"; }
                            else if (promo.Type == PromotionType.FIXED_AMOUNT_DISCOUNT) { currentDiscount = promo.DiscountValue; currentLabel = $"SAVE Rs. {promo.DiscountValue}"; }
                            else if (promo.Type == PromotionType.BUY_ONE_GET_ONE) { currentDiscount = 0.01m; currentLabel = "BUY 1 GET 1 FREE"; }
                            else if (promo.Type == PromotionType.BUY_X_GET_Y && promo.BuyQuantityX.HasValue && promo.GetQuantityY.HasValue) { currentDiscount = 0.01m; currentLabel = $"BUY {promo.BuyQuantityX} GET {promo.GetQuantityY} FREE"; }
                            else if (promo.Type == PromotionType.MINIMUM_SPEND_DISCOUNT || promo.Type == PromotionType.TIERED_DISCOUNT) { currentDiscount = 0.01m; currentLabel = "Cart Discounts Apply"; }

                            if (currentDiscount > highestDiscountValue)
                            {
                                highestDiscountValue = currentDiscount; discountLabel = currentLabel;
                                if (promo.Type == PromotionType.PERCENTAGE_DISCOUNT || promo.Type == PromotionType.FIXED_AMOUNT_DISCOUNT) discountedPrice = Math.Max(0, originalPrice - currentDiscount);
                                else discountedPrice = originalPrice;
                            }
                        }
                    }
                    return new ProductVariantDto { Id = v.Id, SKU = v.SKU, WeightOrSize = v.WeightOrSize, OriginalPrice = originalPrice, DiscountedPrice = discountedPrice, DiscountLabel = discountLabel, StockQuantity = v.StockQuantity, ExpiryDate = v.ExpiryDate, IsActive = v.IsActive };
                }).ToList(),
                Images = p.Images.Select(i => new ProductImageDto { Id = i.Id, ImageUrl = i.ImageUrl, IsPrimary = i.IsPrimary }).ToList()
            }).ToList();

            return Ok(productDtos);
        }

        [HttpGet("products/{id}")]
        public async Task<ActionResult<ProductResponseDto>> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .AsSplitQuery() 
                .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

            if (product == null) return NotFound(new { message = "Product not found." });

            var now = DateTime.UtcNow;
            var activePromotions = await _context.Promotions
                .Include(p => p.PromotionProducts)
                .Include(p => p.PromotionCategories)
                .Where(promo => promo.Status == "ACTIVE" && promo.StartDate <= now && promo.EndDate >= now)
                .ToListAsync();

            return Ok(new ProductResponseDto
            {
                Id = product.Id, Name = product.Name, Brand = product.Brand, Description = product.Description, CategoryId = product.CategoryId, CategoryName = product.Category?.Name ?? string.Empty, IsActive = product.IsActive,
                Variants = product.Variants.Select(v => 
                {
                    decimal originalPrice = v.Price; 
                    decimal? discountedPrice = null;
                    string? discountLabel = null;
                    decimal highestDiscountValue = 0;

                    foreach(var promo in activePromotions)
                    {
                        // FIX: Scoped to 'product'
                        bool isEligible = (!promo.PromotionProducts.Any() && !promo.PromotionCategories.Any() && string.IsNullOrEmpty(promo.TargetBrand)) || 
                                          promo.PromotionProducts.Any(pp => pp.ProductId == product.Id) || 
                                          promo.PromotionCategories.Any(pc => pc.CategoryId == product.CategoryId) || 
                                          (!string.IsNullOrEmpty(promo.TargetBrand) && string.Equals(promo.TargetBrand, product.Brand, StringComparison.OrdinalIgnoreCase));

                        if (isEligible)
                        {
                            decimal currentDiscount = 0;
                            string currentLabel = string.Empty;

                            if (promo.Type == PromotionType.PERCENTAGE_DISCOUNT) { currentDiscount = originalPrice * (promo.DiscountValue / 100m); currentLabel = $"{promo.DiscountValue}% OFF"; }
                            else if (promo.Type == PromotionType.FIXED_AMOUNT_DISCOUNT) { currentDiscount = promo.DiscountValue; currentLabel = $"SAVE Rs. {promo.DiscountValue}"; }
                            else if (promo.Type == PromotionType.BUY_ONE_GET_ONE) { currentDiscount = 0.01m; currentLabel = "BUY 1 GET 1 FREE"; }
                            else if (promo.Type == PromotionType.BUY_X_GET_Y && promo.BuyQuantityX.HasValue && promo.GetQuantityY.HasValue) { currentDiscount = 0.01m; currentLabel = $"BUY {promo.BuyQuantityX} GET {promo.GetQuantityY} FREE"; }
                            else if (promo.Type == PromotionType.MINIMUM_SPEND_DISCOUNT || promo.Type == PromotionType.TIERED_DISCOUNT) { currentDiscount = 0.01m; currentLabel = "Cart Discounts Apply"; }

                            if (currentDiscount > highestDiscountValue)
                            {
                                highestDiscountValue = currentDiscount; discountLabel = currentLabel;
                                if (promo.Type == PromotionType.PERCENTAGE_DISCOUNT || promo.Type == PromotionType.FIXED_AMOUNT_DISCOUNT) discountedPrice = Math.Max(0, originalPrice - currentDiscount);
                                else discountedPrice = originalPrice;
                            }
                        }
                    }
                    return new ProductVariantDto { Id = v.Id, SKU = v.SKU, WeightOrSize = v.WeightOrSize, OriginalPrice = originalPrice, DiscountedPrice = discountedPrice, DiscountLabel = discountLabel, StockQuantity = v.StockQuantity, ExpiryDate = v.ExpiryDate, IsActive = v.IsActive };
                }).ToList(),
                Images = product.Images.Select(i => new ProductImageDto { Id = i.Id, ImageUrl = i.ImageUrl, IsPrimary = i.IsPrimary }).ToList()
            });
        }

        private CategoryDto MapToCategoryDto(velocart_system.API.Models.Category category)
        {
            return new CategoryDto
            {
                Id = category.Id, Name = category.Name, Description = category.Description, ParentCategoryId = category.ParentCategoryId,
                SubCategories = category.SubCategories?.Select(MapToCategoryDto).ToList() ?? new List<CategoryDto>()
            };
        }
    }
}