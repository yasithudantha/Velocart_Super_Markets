using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.DTOs
{
    public class RegisterDto
    {
        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        [RegularExpression(@"^\+?[1-9]\d{1,14}$", ErrorMessage = "Phone number must be in E.164 format (e.g., +94771234567).")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required, MinLength(8)]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", 
            ErrorMessage = "Password must have at least 8 characters, including one uppercase, one lowercase, one number, and one special character.")]
        public string Password { get; set; } = string.Empty;

        [Required, Compare("Password", ErrorMessage = "Passwords do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        public bool AgreeToTerms { get; set; }

        [Required]
        public bool AgreeToPrivacyPolicy { get; set; }
    }
}