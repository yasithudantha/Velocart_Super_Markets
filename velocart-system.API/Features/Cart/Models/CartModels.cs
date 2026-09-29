using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models;
using velocart_system.API.Features.Catalog.Models;

namespace velocart_system.API.Features.Cart.Models
{
    public class ShoppingCart
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        [JsonIgnore]
        public User? User { get; set; }

        public List<ShoppingCartItem> Items { get; set; } = new List<ShoppingCartItem>();

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    public class ShoppingCartItem
    {
        [Key]
        public int Id { get; set; }

        public int ShoppingCartId { get; set; }
        
        [ForeignKey("ShoppingCartId")]
        [JsonIgnore]
        public ShoppingCart? Cart { get; set; }

        public int ProductVariantId { get; set; }
        
        [ForeignKey("ProductVariantId")]
        [JsonIgnore]
        public ProductVariant? Variant { get; set; }

        // Section 3.2: Manual Quantity Input & Management
        public int Quantity { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}