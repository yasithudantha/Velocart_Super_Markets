using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.DTOs
{
    public class UpdateProfileDto
    {
        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [RegularExpression(@"^\+?[1-9]\d{1,14}$", ErrorMessage = "Invalid phone number format.")]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? ProfilePictureUrl { get; set; }
        public bool ReceiveNotifications { get; set; }
        public string CommunicationPreference { get; set; } = "Email";
        public string SavedShoppingPreferences { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;
        
        [Required, MinLength(8, ErrorMessage = "New password must be at least 8 characters long.")]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class RequestEmailChangeDto
    {
        [Required, EmailAddress]
        public string NewEmail { get; set; } = string.Empty;
        
        [Required]
        public string CurrentPassword { get; set; } = string.Empty; // Re-authentication required
    }

    public class DeleteAccountDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty; // Re-authentication required
    }
}