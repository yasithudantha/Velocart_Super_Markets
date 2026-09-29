using System;
using System.Collections.Generic;

namespace velocart_system.API.Features.Catalog.DTOs
{
    public class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? ParentCategoryId { get; set; }
        public List<CategoryDto> SubCategories { get; set; } = new List<CategoryDto>();
    }

    public class ProductVariantDto
    {
        public int Id { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string WeightOrSize { get; set; } = string.Empty;
        
        // SECTION 2.7: Advanced Pricing
        public decimal OriginalPrice { get; set; }
        public decimal? DiscountedPrice { get; set; } 
        public string? DiscountLabel { get; set; } 
        
        public int StockQuantity { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class ProductImageDto
    {
        public int Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }

    public class ProductResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        
        // Ensure Variants and Images lists exist
        public List<ProductVariantDto> Variants { get; set; } = new List<ProductVariantDto>();
        public List<ProductImageDto> Images { get; set; } = new List<ProductImageDto>();
    }
}