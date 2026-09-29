using System;
using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.Features.Identity.DTOs
{
    // READ DTO: Strictly excludes PasswordHash and Tokens
    public class UserManagementResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string AccountStatus { get; set; } = string.Empty;
        public bool IsEmailVerified { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }

    // CREATE STAFF DTO: Enforces strict role assignment
    public class CreateStaffDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        [Required]
        public string PhoneNumber { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        [RegularExpression("^(ADMIN|PRODUCTMANAGER|PROMOTIONMANAGER|DELIVERYMANAGER)$", ErrorMessage = "Invalid Staff Role.")]
        public string Role { get; set; } = string.Empty;
    }

    // UPDATE DTO
    public class UpdateUserRoleStatusDto
    {
        public string? Role { get; set; }
        public string? AccountStatus { get; set; }
    }
}