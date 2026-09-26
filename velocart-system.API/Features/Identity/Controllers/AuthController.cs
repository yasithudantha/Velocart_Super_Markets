using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.DTOs;
using velocart_system.API.Models;
using velocart_system.API.Services; 
using velocart_system.API.Features.Loyalty.Models;
using velocart_system.API.Features.Identity.Models; // NEW: Required for Loyalty Account generation

namespace velocart_system.API.Features.Identity.Controllers
{
    public class TokenRefreshRequest { public string Token { get; set; } = string.Empty; public string RefreshToken { get; set; } = string.Empty; }
    public class LogoutRequest { public int UserId { get; set; } }

    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthController> _logger; 

        public AuthController(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService, ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        // ==========================================
        // NEW: LOYALTY CARD GENERATION HELPERS
        // ==========================================
        private async Task<int> GetOrCreateDefaultSilverTierAsync()
        {
            var silver = await _context.LoyaltyRules.FirstOrDefaultAsync(r => r.TierName == "Silver");
            if (silver != null) return silver.Id;

            // Seed the default Silver rule from the SRS if it doesn't exist
            silver = new LoyaltyRule
            {
                TierName = "Silver",
                MinimumPoints = 0,
                MaximumPoints = 100000,
                CurrencyAmountPerPoint = 100, // Rs. 100 = 1 Point
                MaxRedeemablePointsPerOrder = 50000,
                MaxDiscountPercentage = 5.00m, // 5% max discount
                EligibleCategoryIds = "[]",
                PointExpiryDays = 365,
                TierEvaluationPeriodDays = 365,
                IsActive = true
            };
            
            _context.LoyaltyRules.Add(silver);
            await _context.SaveChangesAsync();
            return silver.Id;
        }

        private async Task<string> GenerateUniqueLoyaltyIdAsync()
        {
            var random = new Random();
            while (true)
            {
                // Generate a 16-digit number starting with standard 6000 retail prefix
                var builder = new StringBuilder("6000"); 
                for (int i = 0; i < 12; i++) builder.Append(random.Next(0, 10));
                
                var newId = builder.ToString();
                
                // Verify uniqueness against the database
                if (!await _context.LoyaltyAccounts.AnyAsync(l => l.LoyaltyIdNumber == newId))
                    return newId;
            }
        }
        // ==========================================

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] TokenRefreshRequest request)
        {
            var principal = GetPrincipalFromExpiredToken(request.Token);
            if (principal == null) return BadRequest("Invalid client request");

            var email = principal.FindFirst(ClaimTypes.Email)?.Value;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || user.RefreshToken != request.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                _logger.LogWarning("SECURITY ALERT: Invalid refresh token attempt for user {Email}", email);
                return BadRequest("Invalid token or session expired. Please log in again.");
            }

            var newJwtToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7); 
            await _context.SaveChangesAsync();

            return Ok(new { token = newJwtToken, refreshToken = newRefreshToken });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user != null)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = null;
                await _context.SaveChangesAsync();
                _logger.LogInformation("User {UserId} explicitly logged out.", user.Id);
            }
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            try
            {
                var normalizedEmail = request.Email.Trim().ToLower();
                if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail)) return BadRequest(new { message = "Email is already registered." });

                var formattedPhone = request.PhoneNumber.Trim();
                if (await _context.Users.AnyAsync(u => u.PhoneNumber == formattedPhone)) 
                    return BadRequest(new { message = "This phone number is already registered to another account." });

                // Generate Loyalty details dynamically
                var defaultTierId = await GetOrCreateDefaultSilverTierAsync();
                var loyaltyId = await GenerateUniqueLoyaltyIdAsync();

                var newUser = new User
                {
                    FullName = request.FullName.Trim(),
                    Email = normalizedEmail,
                    PhoneNumber = request.PhoneNumber.Trim(), 
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    AuthProvider = "LOCAL",
                    AgreedToTerms = request.AgreeToTerms,
                    AgreedToPrivacyPolicy = request.AgreeToPrivacyPolicy,
                    AccountStatus = "Email unverified",
                    VerificationToken = Guid.NewGuid().ToString(), 
                    VerificationTokenExpires = DateTime.UtcNow.AddHours(24),
                    Role = "CUSTOMER",
                    
                    // NEW: Automated VelocityFamily Loyalty Account Creation
                    LoyaltyAccount = new LoyaltyAccount
                    {
                        LoyaltyIdNumber = loyaltyId,
                        CurrentTierRuleId = defaultTierId,
                        Status = "ACTIVE",
                        ExpiryDate = DateTime.UtcNow.AddYears(1),
                        LastRenewedAt = DateTime.UtcNow
                    }
                };

                _context.Users.Add(newUser);
                await _context.SaveChangesAsync();
                
                var verificationLink = $"http://localhost:5173/verify-email?token={newUser.VerificationToken}";
                var emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                        <h2 style='color: #D4AF37;'>Welcome to Velocart!</h2>
                        <p>Hi {newUser.FullName},</p>
                        <p>Thank you for creating an account. To verify your email, please copy the code below and enter it into the application on your computer.</p>
                        <div style='background-color: #f4f4f4; color: #333; padding: 15px; text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 20px 0; border-radius: 5px;'>
                            {newUser.VerificationToken}
                        </div>
                        <p style='margin-top: 30px; font-size: 12px; color: #888;'>If you did not create this account, you can safely ignore this email.</p>
                    </div>";
                
                await _emailService.SendEmailAsync(newUser.Email, "Verify Your Velocart Account", emailBody);
                return Ok(new { message = "Registration successful. Please check your email to verify your account.", token = newUser.VerificationToken });
            }
            catch (Exception ex)
            {
                _logger.LogError("Registration failed: {Error}", ex.Message);
                return StatusCode(500, new { message = "An error occurred during registration.", details = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            try
            {
                var normalizedEmail = request.Email.Trim().ToLower();
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

                if (user == null || user.PasswordHash == null) 
                {
                    _logger.LogWarning("Failed login attempt for unknown email: {Email}", normalizedEmail);
                    return BadRequest(new { message = "Invalid email or password." });
                }

                if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
                {
                    var remaining = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
                    return BadRequest(new { message = $"Account is temporarily locked. Try again in {remaining} minutes." });
                }

                if (user.AccountStatus == "Suspended" || user.AccountStatus == "Deleted")
                    return BadRequest(new { message = "This account has been suspended or deactivated." });

                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                {
                    user.FailedLoginAttempts++;
                    if (user.FailedLoginAttempts >= 5) 
                    {
                        user.LockoutEnd = DateTime.UtcNow.AddMinutes(15); 
                        await _context.SaveChangesAsync();
                        _logger.LogWarning("SECURITY ALERT: Account {Email} locked due to brute force attempt.", normalizedEmail);
                        return BadRequest(new { message = "Account locked due to too many failed attempts. Try again in 15 minutes." });
                    }
                    await _context.SaveChangesAsync();
                    return BadRequest(new { message = "Invalid email or password." });
                }

                user.FailedLoginAttempts = 0;
                user.LockoutEnd = null;
                
                var refreshToken = GenerateRefreshToken();
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                // Inside your existing Login method:
                _context.SecurityEvents.Add(new SecurityEvent {
                    UserId = user.Id, EventType = "Successful Login", Description = "User logged in successfully via API."
                });
                user.LastLoginAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successful login for {Email}", normalizedEmail);
                return Ok(new { message = "Login successful.", token = GenerateJwtToken(user), refreshToken, user = GetUserResponseObject(user) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during login.", details = ex.Message });
            }
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthDto request)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings() { Audience = new List<string>() { _configuration["Google:ClientId"]! } };
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
                var normalizedEmail = payload.Email.Trim().ToLower();
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

                if (user == null)
                {
                    // Generate Loyalty details dynamically for Google Registration
                    var defaultTierId = await GetOrCreateDefaultSilverTierAsync();
                    var loyaltyId = await GenerateUniqueLoyaltyIdAsync();

                    user = new User
                    {
                        FullName = payload.Name ?? "Google User", Email = normalizedEmail, PhoneNumber = $"GOOGLE_{payload.Subject}", PasswordHash = null,
                        AuthProvider = "GOOGLE", ProviderId = payload.Subject, AccountStatus = "Active", 
                        ProfilePictureUrl = payload.Picture, Role = "CUSTOMER", AgreedToTerms = true, AgreedToPrivacyPolicy = true,
                        
                        // NEW: Automated VelocityFamily Loyalty Account Creation
                        LoyaltyAccount = new LoyaltyAccount
                        {
                            LoyaltyIdNumber = loyaltyId,
                            CurrentTierRuleId = defaultTierId,
                            Status = "ACTIVE",
                            ExpiryDate = DateTime.UtcNow.AddYears(1),
                            LastRenewedAt = DateTime.UtcNow
                        }
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();

                    var emailBody = $@"<div style='font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                        <h2 style='color: #D4AF37;'>Welcome to Velocart!</h2>
                        <p>Hi {user.FullName}, your account and VelocityFamily Loyalty Card were successfully created and linked with Google!</p>
                    </div>";
                    await _emailService.SendEmailAsync(user.Email, "Welcome to Velocart", emailBody);
                }
                else
                {
                    if (user.AccountStatus == "Suspended" || user.AccountStatus == "Deleted") return BadRequest(new { message = "This account has been suspended or deactivated." });

                    if (user.AuthProvider == "LOCAL")
                    {
                        user.AuthProvider = "GOOGLE"; user.ProviderId = payload.Subject; user.AccountStatus = "Active"; user.ProfilePictureUrl = payload.Picture;
                    }
                    user.FailedLoginAttempts = 0; user.LockoutEnd = null;
                }

                var refreshToken = GenerateRefreshToken();
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Google authentication successful.", token = GenerateJwtToken(user), refreshToken, user = GetUserResponseObject(user) });
            }
            catch (InvalidJwtException) 
            {
                return BadRequest(new { message = "Invalid or expired Google authentication token." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during Google authentication.", details = ex.Message });
            }
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrEmpty(token)) return BadRequest(new { message = "Invalid verification token." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.VerificationToken == token);
            if (user == null || user.VerificationTokenExpires < DateTime.UtcNow) return BadRequest(new { message = "Invalid or expired verification token." });

            user.AccountStatus = "Active"; user.VerificationToken = null; user.VerificationTokenExpires = null;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Email verified successfully. Your account is now active." });
        }

        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] ForgotPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower());
            var msg = "If your email is registered and unverified, a new link has been sent.";
            if (user == null || user.AccountStatus != "Email unverified") return Ok(new { message = msg });

            user.VerificationToken = Guid.NewGuid().ToString(); user.VerificationTokenExpires = DateTime.UtcNow.AddHours(24);
            await _context.SaveChangesAsync();
            var verificationLink = $"http://localhost:5173/verify-email?token={user.VerificationToken}";
            var emailBody = $"<h3>Velocart Verification</h3><p>Please verify your email by clicking <a href='{verificationLink}'>here</a>.</p>";
            await _emailService.SendEmailAsync(user.Email, "Verify Your Velocart Account", emailBody);
            return Ok(new { message = msg, token = user.VerificationToken }); 
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower());
            var msg = "If an account with that email exists, a password reset link has been sent.";
            
            if (user == null || user.AuthProvider == "GOOGLE") return Ok(new { message = msg });

            user.PasswordResetToken = Guid.NewGuid().ToString(); user.PasswordResetTokenExpires = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();
            var resetLink = $"http://localhost:5173/reset-password?token={user.PasswordResetToken}";
            
            var emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                    <h2 style='color: #D4AF37;'>Password Reset Request</h2>
                    <p>We received a request to reset the password for your Velocart account.</p>
                    <a href='{resetLink}' style='display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 20px;'>Reset Password</a>
                    <p style='margin-top: 30px; font-size: 12px; color: #888;'>This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
                </div>";
            await _emailService.SendEmailAsync(user.Email, "Reset Your Velocart Password", emailBody);
            return Ok(new { message = msg, token = user.PasswordResetToken });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.PasswordResetToken == request.Token);
            if (user == null || user.PasswordResetTokenExpires < DateTime.UtcNow) return BadRequest(new { message = "Invalid or expired reset token." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordResetToken = null; user.PasswordResetTokenExpires = null; user.FailedLoginAttempts = 0; user.LockoutEnd = null;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password successfully reset." });
        }

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("AccountStatus", user.AccountStatus)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(15), 
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
            };
            return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityTokenHandler().CreateToken(tokenDescriptor));
        }

        private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = true, ValidAudience = _configuration["Jwt:Audience"],
                ValidateIssuer = true, ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!)),
                ValidateLifetime = false 
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
            var jwtSecurityToken = securityToken as JwtSecurityToken;
            if (jwtSecurityToken == null || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");

            return principal;
        }

        private object GetUserResponseObject(User user)
        {
            return new { id = user.Id, fullName = user.FullName, email = user.Email, role = user.Role, accountStatus = user.AccountStatus, profilePictureUrl = user.ProfilePictureUrl };
        }
    }
}