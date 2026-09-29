using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Catalog.DTOs
{
    public class CreateProductDto
    {
        [Required(ErrorMessage = "Product name is required."), MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Brand is required."), MaxLength(100)]
        public string Brand { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category assignment is required.")]
        public int CategoryId { get; set; }

        [Required, MinLength(1, ErrorMessage = "A product must have at least one variant.")]
        public List<CreateVariantDto> Variants { get; set; } = new List<CreateVariantDto>();
    }

    public class CreateVariantDto
    {
        [Required]
        [RegularExpression(@"^[A-Z0-9-]+$", ErrorMessage = "SKU must contain only uppercase letters, numbers, and hyphens.")]
        public string SKU { get; set; } = string.Empty;

        [Required]
        public string WeightOrSize { get; set; } = string.Empty;

        [Required, Range(0.01, 1000000, ErrorMessage = "Price must be greater than zero.")]
        public decimal Price { get; set; }

        [Required, Range(0, 10000, ErrorMessage = "Stock quantity cannot be negative.")]
        public int StockQuantity { get; set; }

        public DateTime? ExpiryDate { get; set; }
    }

    // NEW: Update DTOs for the Edit Functionality
    public class UpdateProductDto
    {
        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;
        [Required, MaxLength(100)]
        public string Brand { get; set; } = string.Empty;
        [Required]
        public string Description { get; set; } = string.Empty;
        [Required]
        public int CategoryId { get; set; }
        public bool IsActive { get; set; }
        [Required]
        public List<UpdateVariantDto> Variants { get; set; } = new List<UpdateVariantDto>();
    }

    public class UpdateVariantDto
    {
        public int Id { get; set; } // Will be 0 if the Admin added a NEW variant during Edit
        [Required]
        [RegularExpression(@"^[A-Z0-9-]+$", ErrorMessage = "SKU must contain only uppercase letters, numbers, and hyphens.")]
        public string SKU { get; set; } = string.Empty;
        [Required]
        public string WeightOrSize { get; set; } = string.Empty;
        [Required, Range(0.01, 1000000)]
        public decimal Price { get; set; }
        [Required, Range(0, 10000)]
        public int StockQuantity { get; set; }
        public bool IsActive { get; set; }
    }
}