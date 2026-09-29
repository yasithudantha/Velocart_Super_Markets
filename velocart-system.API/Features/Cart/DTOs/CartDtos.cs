using System.Collections.Generic;

namespace velocart_system.API.Features.Cart.DTOs
{
    public class AddToCartDto
    {
        public int ProductVariantId { get; set; }
        public int Quantity { get; set; }
    }

    public class CartItemResponseDto
    {
        public int Id { get; set; }
        public int ProductVariantId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        
        public int Quantity { get; set; }
        public int AvailableStock { get; set; } // Used for frontend validation
        
        // Pricing Revalidation (Section 3.21)
        public decimal UnitPrice { get; set; } // The active price (discounted or original)
        public decimal TotalPrice => UnitPrice * Quantity;
        
        // Status checks (Section 3.24)
        public bool IsAvailable { get; set; }
    }

    public class CartResponseDto
    {
        public int CartId { get; set; }
        public int UserId { get; set; }
        public List<CartItemResponseDto> Items { get; set; } = new List<CartItemResponseDto>();
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal GrandTotal { get; set; }
    }
}