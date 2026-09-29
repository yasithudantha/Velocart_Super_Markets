using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.DTOs;
using velocart_system.API.Services;

namespace velocart_system.API.Features.Identity.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // STRICT SECURITY: Valid JWT required for all endpoints
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;

        public UserController(ApplicationDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        private int GetUserIdFromToken()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out int userId) ? userId : 0;
        }

        // ==========================================
        // 1. GET PROFILE
        // ==========================================
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetUserIdFromToken();
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.AccountStatus == "Deleted") return NotFound(new { message = "User not found." });

            var profileDto = new UserProfileDto
            {
                Id = user.Id, FullName = user.FullName, Email = user.Email, PhoneNumber = user.PhoneNumber,
                Role = user.Role, AccountStatus = user.AccountStatus, ProfilePictureUrl = user.ProfilePictureUrl,
                ReceiveNotifications = user.ReceiveNotifications, CommunicationPreference = user.CommunicationPreference,
                SavedShoppingPreferences = user.SavedShoppingPreferences
            };

            return Ok(profileDto);
        }

        // ==========================================
        // 2. UPDATE PROFILE PREFERENCES
        // ==========================================
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userId = GetUserIdFromToken();
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.AccountStatus == "Deleted") return NotFound(new { message = "User not found." });

            // Application-level unique phone check
            if (await _context.Users.AnyAsync(u => u.PhoneNumber == request.PhoneNumber && u.Id != userId))
            {
                return Conflict(new { message = "This phone number is already registered to another account." });
            }

            user.FullName = request.FullName.Trim();
            user.PhoneNumber = request.PhoneNumber.Trim();
            user.ProfilePictureUrl = request.ProfilePictureUrl;
            user.ReceiveNotifications = request.ReceiveNotifications;
            user.CommunicationPreference = request.CommunicationPreference;
            user.SavedShoppingPreferences = request.SavedShoppingPreferences;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully." });
        }

        // ==========================================
        // 3. CHANGE PASSWORD
        // ==========================================
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
        {
            var userId = GetUserIdFromToken();
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.AuthProvider == "GOOGLE") return BadRequest(new { message = "Password changes are not allowed for Google accounts." });

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return Unauthorized(new { message = "Incorrect current password." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password updated successfully." });
        }

        // ==========================================
        // 4. REQUEST EMAIL CHANGE (The endpoint that was missing!)
        // ==========================================
        [HttpPost("request-email-change")]
        public async Task<IActionResult> RequestEmailChange([FromBody] RequestEmailChangeDto request)
        {
            var userId = GetUserIdFromToken();
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.AuthProvider == "GOOGLE") return BadRequest(new { message = "Email changes are not allowed for Google accounts." });

            // Sensitive-Change Re-authentication
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return Unauthorized(new { message = "Incorrect password. Email change request denied." });

            if (await _context.Users.AnyAsync(u => u.Email == request.NewEmail.ToLower().Trim()))
                return Conflict(new { message = "This email address is already in use." });

            user.PendingNewEmail = request.NewEmail.ToLower().Trim();
            user.EmailChangeToken = Guid.NewGuid().ToString();
            user.EmailChangeTokenExpires = DateTime.UtcNow.AddHours(2);
            await _context.SaveChangesAsync();

            // Fire Verification Email to the NEW address
            var verificationLink = $"http://localhost:5173/verify-email-change?token={user.EmailChangeToken}";
            var emailBody = $"<h3>Confirm Email Change</h3><p>Please click <a href='{verificationLink}'>here</a> to confirm your new email address for Velocart.</p>";
            await _emailService.SendEmailAsync(user.PendingNewEmail, "Confirm your new Velocart Email", emailBody);

            return Ok(new { message = "Verification email sent to the new address." });
        }

        // ==========================================
        // 5. VERIFY EMAIL CHANGE
        // ==========================================
        [HttpGet("verify-email-change")]
        public async Task<IActionResult> VerifyEmailChange([FromQuery] string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailChangeToken == token);
            if (user == null || user.EmailChangeTokenExpires < DateTime.UtcNow) return BadRequest(new { message = "Invalid or expired token." });

            user.Email = user.PendingNewEmail!;
            user.PendingNewEmail = null;
            user.EmailChangeToken = null;
            user.EmailChangeTokenExpires = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Email updated successfully. Please log in with your new email." });
        }

        // ==========================================
        // 6. DELETE ACCOUNT (CUSTOMER ONLY)
        // ==========================================
        [HttpDelete("delete-account")]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto request)
        {
            var userId = GetUserIdFromToken();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (user.Role == "ADMIN") return BadRequest(new { message = "Administrators cannot self-delete." });

            // Sensitive-Change Re-authentication
            if (user.AuthProvider == "LOCAL" && !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return Unauthorized(new { message = "Incorrect password. Account deletion denied." });

            // Enterprise Soft Delete (Preserves historical Orders for analytics)
            user.AccountStatus = "Deleted";
            user.Email = $"deleted_{user.Id}_{Guid.NewGuid()}@velocart.com"; // Anonymize to free up email
            user.PhoneNumber = $"deleted_{user.Id}";
            user.FullName = "Deleted User";
            user.PasswordHash = null;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Account successfully deleted." });
        }
    }
}