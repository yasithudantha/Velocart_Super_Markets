using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using velocart_system.API.Models;
using velocart_system.API.Features.Catalog.Models;
using velocart_system.API.Features.Loyalty.Models; 

namespace velocart_system.API.Features.Orders.Models
{
    public class Order
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OrderNumber { get; set; } = string.Empty;

        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        [JsonIgnore]
        public User? User { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal GrandTotal { get; set; }

        public decimal PromotionDiscountAmount { get; set; } = 0;

        // SRS Rule 6.9: Loyalty Order Details
        public int LoyaltyPointsUsed { get; set; } = 0;
        public decimal LoyaltyDiscountAmount { get; set; } = 0;

        // Section 4.7 & 4.14: Order and Payment Statuses separated!
        public string OrderStatus { get; set; } = "PENDING"; 
        public string PaymentStatus { get; set; } = "PENDING"; // PENDING, AUTHORIZED, PAID, FAILED, REFUNDED
        
        // Section 4.13: Payment Method
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = "CARD"; // CARD, COD, BANK_TRANSFER

        // Section 4.16: Idempotency Key to prevent duplicate orders
        [MaxLength(100)]
        public string IdempotencyKey { get; set; } = string.Empty; 

        public string DeliveryAddress { get; set; } = string.Empty;
        public string DeliveryMethod { get; set; } = "STANDARD";

        public List<OrderItem> Items { get; set; } = new List<OrderItem>();

        // NEW: SRS Rule 2.20 & 2.31 - Snapshot list of all applied promotions for this specific order
        public List<OrderPromotion> AppliedPromotions { get; set; } = new List<OrderPromotion>();

        // Delivery & Confirmation Tracking
        public bool IsCustomerConfirmed { get; set; } = false; 
        public DeliveryDetail? DeliveryDetail { get; set; }
        public List<DeliveryComplaint> Complaints { get; set; } = new List<DeliveryComplaint>();
        public List<OrderLocation> Locations { get; set; } = new List<OrderLocation>();
    }

    public class OrderItem
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        
        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        public int ProductVariantId { get; set; }
        
        [ForeignKey("ProductVariantId")]
        [JsonIgnore]
        public ProductVariant? Variant { get; set; }

        public string ProductName { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        
        // --- NEW: Historical Invoice Snapshots ---
        public decimal OriginalUnitPrice { get; set; } // The base price before anything was applied
        public decimal PromotionDiscountAmount { get; set; } // The specific discount applied to this item
        public decimal TaxAmount { get; set; } // The specific tax applied to this item
        
        public decimal UnitPrice { get; set; } // The final effective price of the item
        
        public decimal ItemTotal => Quantity * UnitPrice;
    }
}