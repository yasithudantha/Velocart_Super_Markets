using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Models;
using velocart_system.API.Features.Catalog.DTOs;
using velocart_system.API.Services;

namespace velocart_system.API.Features.Catalog.Controllers
{
    // NEW: Small inline DTO for Category Creation
    public class CreateCategoryRequest
    {
        [Required(ErrorMessage = "Category name is required")]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    [Route("api/admin/products")]
    [ApiController]
    [Authorize(Roles = "ADMIN,PRODUCTMANAGER")]
    public class AdminProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IImageService _imageService;

        public AdminProductsController(ApplicationDbContext context, IImageService imageService)
        {
            _context = context;
            _imageService = imageService;
        }

        // ==========================================
        // NEW: Dynamic Category Creation Endpoint
        // ==========================================
        [HttpPost("categories")]
        public async Task<ActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            // Prevent duplicate categories
            if (await _context.Categories.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower()))
            {
                return Conflict(new { message = $"The category '{request.Name}' already exists." });
            }

            var category = new Category
            {
                Name = request.Name,
                Description = request.Description
            };

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(new { id = category.Id, name = category.Name });
        }

        // ==========================================
        // Existing Product Endpoints Below
        // ==========================================
        [HttpPost]
        public async Task<ActionResult> CreateProduct([FromBody] CreateProductDto request)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId);
            if (!categoryExists) return BadRequest("The specified category does not exist.");

            var requestedSkus = request.Variants.Select(v => v.SKU).ToList();
            var existingSkus = await _context.ProductVariants.Where(v => requestedSkus.Contains(v.SKU)).Select(v => v.SKU).ToListAsync();
            if (existingSkus.Any()) return Conflict(new { message = "SKU Conflict Detected", duplicateSkus = existingSkus });

            var product = new Product { Name = request.Name, Brand = request.Brand, Description = request.Description, CategoryId = request.CategoryId, IsActive = true, CreatedAt = DateTime.UtcNow };
            foreach (var v in request.Variants) product.Variants.Add(new ProductVariant { SKU = v.SKU, WeightOrSize = v.WeightOrSize, Price = v.Price, StockQuantity = v.StockQuantity, ExpiryDate = v.ExpiryDate, IsActive = true });

            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product created successfully.", productId = product.Id });
        }

        [HttpGet]
        public async Task<ActionResult> GetAllProducts()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .Select(p => new
                {
                    p.Id, p.Name, p.Brand, p.Description, p.CategoryId, 
                    CategoryName = p.Category != null ? p.Category.Name : "Uncategorized",
                    p.IsActive,
                    Variants = p.Variants.Select(v => new { v.Id, v.SKU, v.WeightOrSize, v.Price, v.StockQuantity, v.IsActive }),
                    Images = p.Images.Select(i => new { i.ImageUrl, i.IsPrimary })
                })
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            return Ok(products);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateProduct(int id, [FromBody] UpdateProductDto request)
        {
            var product = await _context.Products.Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == id);
            if (product == null) return NotFound("Product not found.");

            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId);
            if (!categoryExists) return BadRequest("The specified category does not exist.");

            product.Name = request.Name;
            product.Brand = request.Brand;
            product.Description = request.Description;
            product.CategoryId = request.CategoryId;
            product.IsActive = request.IsActive;

            foreach (var incomingVariant in request.Variants)
            {
                if (incomingVariant.Id == 0) 
                {
                    if (await _context.ProductVariants.AnyAsync(v => v.SKU == incomingVariant.SKU)) return Conflict(new { message = $"SKU {incomingVariant.SKU} already exists." });
                    product.Variants.Add(new ProductVariant { SKU = incomingVariant.SKU, WeightOrSize = incomingVariant.WeightOrSize, Price = incomingVariant.Price, StockQuantity = incomingVariant.StockQuantity, IsActive = incomingVariant.IsActive });
                }
                else 
                {
                    var existing = product.Variants.FirstOrDefault(v => v.Id == incomingVariant.Id);
                    if (existing != null)
                    {
                        if (existing.SKU != incomingVariant.SKU && await _context.ProductVariants.AnyAsync(v => v.SKU == incomingVariant.SKU)) return Conflict(new { message = $"SKU {incomingVariant.SKU} already exists." });
                        existing.SKU = incomingVariant.SKU; existing.WeightOrSize = incomingVariant.WeightOrSize; existing.Price = incomingVariant.Price; existing.StockQuantity = incomingVariant.StockQuantity; existing.IsActive = incomingVariant.IsActive;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Product updated successfully." });
        }

        [HttpPost("{productId}/images")]
        public async Task<ActionResult> UploadImages(int productId, [FromForm] List<IFormFile> images)
        {
            var product = await _context.Products.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == productId);
            if (product == null) return NotFound("Product not found.");
            if (images == null || !images.Any()) return BadRequest("No images provided.");
            if (images.Count > 5) return BadRequest("Maximum 5 images allowed per upload.");

            bool hasExistingPrimary = product.Images.Any(i => i.IsPrimary);
            var uploadedImages = new List<ProductImage>();

            foreach (var file in images)
            {
                try
                {
                    string cdnUrl = await _imageService.UploadImageAsync(file);
                    var productImage = new ProductImage { ProductId = productId, ImageUrl = cdnUrl, IsPrimary = !hasExistingPrimary && !uploadedImages.Any() };
                    _context.ProductImages.Add(productImage); uploadedImages.Add(productImage);
                }
                catch (Exception ex) { return BadRequest($"Image upload failed for {file.FileName}: {ex.Message}"); }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = $"{uploadedImages.Count} images uploaded successfully.", images = uploadedImages.Select(i => i.ImageUrl) });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound("Product not found.");

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product deleted successfully." });
        }
    }
}