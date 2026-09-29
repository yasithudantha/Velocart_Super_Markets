using System.Collections.Generic;

namespace velocart_system.API.Features.Orders.DTOs
{
    public class CheckoutRequestDto
    {
        public string DeliveryAddress { get; set; } = string.Empty;
        public string DeliveryMethod { get; set; } = "STANDARD";
        public decimal ExpectedTotal { get; set; }
        public bool ForceCheckout { get; set; } = false;
        
        // Payment & Security Fields
        public string PaymentMethod { get; set; } = "CARD";
        public string IdempotencyKey { get; set; } = string.Empty;

        // NEW: SRS 6.7 Loyalty Point Redemption
        public int PointsToRedeem { get; set; } = 0;
    }

    public class CheckoutResponseDto
    {
        public string OrderNumber { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal DiscountAmount { get; set; }
        public string Message { get; set; } = string.Empty;
        public decimal GrandTotal { get; set; }
        public decimal ActualTotal { get; set; } 
        public bool PriceChanged { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public string StripeUrl { get; set; } = string.Empty;

        // NEW: To confirm back to the frontend how much loyalty value was applied
        public int PointsRedeemed { get; set; } = 0;
        public decimal LoyaltyDiscountApplied { get; set; } = 0;
    }
}