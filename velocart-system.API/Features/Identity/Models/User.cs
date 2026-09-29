using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using velocart_system.API.Features.Loyalty.Models;
using velocart_system.API.Features.Promotions.Models; // NEW: Required for personalized promotions

namespace velocart_system.API.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        public string? PasswordHash { get; set; }

        [Required, MaxLength(20)]
        public string AuthProvider { get; set; } = "LOCAL"; 
        
        public string? ProviderId { get; set; } 

        [Required, MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Role { get; set; } = "CUSTOMER"; // CUSTOMER, ADMIN, PRODUCTMANAGER, DELIVERY, SUPPORT

        public string? ProfilePictureUrl { get; set; }

        public bool AgreedToTerms { get; set; } = false;
        public bool AgreedToPrivacyPolicy { get; set; } = false;

        // Customer Profile Management: Preferences
        public bool ReceiveNotifications { get; set; } = true;
        [MaxLength(20)]
        public string CommunicationPreference { get; set; } = "Email"; // "Email", "SMS", or "Both"
        [MaxLength(1000)]
        public string SavedShoppingPreferences { get; set; } = string.Empty; // JSON string of preferences

        public string AccountStatus { get; set; } = "Email unverified";
        public string? VerificationToken { get; set; }
        public DateTime? VerificationTokenExpires { get; set; }

        // Secure Email Update Workflow
        [MaxLength(150)]
        public string? PendingNewEmail { get; set; }
        public string? EmailChangeToken { get; set; }
        public DateTime? EmailChangeTokenExpires { get; set; }

        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpires { get; set; }

        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEnd { get; set; }

        public ICollection<Address> Addresses { get; set; } = new List<Address>();

        public LoyaltyAccount? LoyaltyAccount { get; set; }
        
        // NEW: Allows tracking of personalized, customer-specific promotions
        public ICollection<PromotionCustomer> PersonalizedPromotions { get; set; } = new List<PromotionCustomer>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        public DateTime? LastLoginAt { get; set; }

        public bool IsEmailVerified { get; set; } = false;
    }
}