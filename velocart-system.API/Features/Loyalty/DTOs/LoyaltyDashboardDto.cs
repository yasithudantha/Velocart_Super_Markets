using System;

namespace velocart_system.API.Features.Loyalty.DTOs
{
    public class LoyaltyDashboardResponseDto
    {
        public string CustomerName { get; set; } = string.Empty;
        public string LoyaltyIdNumber { get; set; } = string.Empty;
        public string CurrentTier { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
        
        public int CurrentPointsBalance { get; set; }
        public int TotalPointsEarned { get; set; }
        public int TotalPointsRedeemed { get; set; }
        public decimal TotalEligibleSpend { get; set; }

        // SRS 6.1.2: Progress toward the next package
        public string NextTier { get; set; } = string.Empty;
        public int PointsRequiredForNextTier { get; set; }
        public decimal ProgressPercentage { get; set; }
    }
}