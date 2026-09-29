using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.Features.Identity.Models;
using velocart_system.API.Features.Identity.DTOs;
using BCrypt.Net;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Identity.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "MAINADMIN")] // STRICT AUTHORIZATION REQUIREMENT 6
    public class MainAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MainAdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new UnauthorizedAccessException("Invalid token claims.");
        }

        // ==========================================
        // 1. SEARCH & FILTER USERS (Requirements 3 & 4)
        // ==========================================
        [HttpGet("users")]
        public async Task<ActionResult> GetUsers([FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(searchTerm) || 
                                         u.Email.ToLower().Contains(searchTerm) || 
                                         u.PhoneNumber.Contains(searchTerm));
            }

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role.ToUpper() == role.ToUpper());

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(u => u.AccountStatus.ToUpper() == status.ToUpper());

            var users = await query.OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserManagementResponseDto
                {
                    Id = u.Id, FullName = u.FullName, Email = u.Email, PhoneNumber = u.PhoneNumber,
                    Role = u.Role, AccountStatus = u.AccountStatus, IsEmailVerified = u.IsEmailVerified,
                    CreatedAt = u.CreatedAt, LastLoginAt = u.LastLoginAt
                }).ToListAsync();

            return Ok(users);
        }

        // ==========================================
        // 2. CREATE STAFF ACCOUNT (Requirement 1 & 2)
        // ==========================================
        [HttpPost("staff")]
        public async Task<ActionResult> CreateStaffAccount([FromBody] CreateStaffDto request)
        {
            var adminId = GetSecureUserId();

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest(new { message = "Email is already in use." });

            var newStaff = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Role = request.Role.ToUpper(),
                AccountStatus = "ACTIVE",
                IsEmailVerified = true, // Auto-verified since Main Admin created it
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            _context.Users.Add(newStaff);
            await _context.SaveChangesAsync();

            // AUDIT LOG
            _context.SecurityEvents.Add(new SecurityEvent {
                UserId = newStaff.Id, PerformedByUserId = adminId,
                EventType = "Account Created",
                Description = $"Staff account created with role {newStaff.Role} by MAINADMIN {adminId}"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Staff account ({newStaff.Role}) successfully created." });
        }

        // ==========================================
        // 3. UPDATE USER STATUS & ROLE (Requirement 2 & 11)
        // ==========================================
        [HttpPut("users/{id}")]
        public async Task<ActionResult> UpdateUser(int id, [FromBody] UpdateUserRoleStatusDto request)
        {
            var adminId = GetSecureUserId();
            var targetUser = await _context.Users.FindAsync(id);

            if (targetUser == null) return NotFound("User not found.");
            
            // Protection Rule: Prevent modifying MAINADMIN
            if (targetUser.Role == "MAINADMIN") return Forbid("Cannot modify another MAIN ADMIN account.");
            // Protection Rule: Prevent self-modification lockout
            if (targetUser.Id == adminId) return BadRequest("You cannot modify your own core privileges from this panel.");

            bool roleChanged = false;
            if (!string.IsNullOrWhiteSpace(request.Role) && targetUser.Role != request.Role.ToUpper())
            {
                if (request.Role.ToUpper() == "MAINADMIN") return Forbid("Cannot promote users to MAINADMIN via API.");
                targetUser.Role = request.Role.ToUpper();
                roleChanged = true;
            }

            bool statusChanged = false;
            if (!string.IsNullOrWhiteSpace(request.AccountStatus) && targetUser.AccountStatus != request.AccountStatus.ToUpper())
            {
                targetUser.AccountStatus = request.AccountStatus.ToUpper();
                statusChanged = true;
            }

            if (roleChanged || statusChanged)
            {
                _context.SecurityEvents.Add(new SecurityEvent {
                    UserId = targetUser.Id, PerformedByUserId = adminId,
                    EventType = "Privilege Update",
                    Description = $"Role changed to {targetUser.Role}. Status changed to {targetUser.AccountStatus}. Performed by MAINADMIN {adminId}"
                });
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "User successfully updated." });
        }

        // ==========================================
        // 4. SECURITY AUDIT HISTORY (Requirement 5)
        // ==========================================
        [HttpGet("users/{id}/history")]
        public async Task<ActionResult> GetUserSecurityHistory(int id)
        {
            var history = await _context.SecurityEvents
                .Where(e => e.UserId == id)
                .OrderByDescending(e => e.Timestamp)
                .Select(e => new { e.EventType, e.Description, e.Timestamp, e.PerformedByUserId })
                .ToListAsync();

            return Ok(history);
        }
    }
}