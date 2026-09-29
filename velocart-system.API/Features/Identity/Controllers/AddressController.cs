using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using velocart_system.API.Data;
using velocart_system.API.DTOs;
using velocart_system.API.Models;

namespace velocart_system.API.Features.Identity.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Strict Security: JWT Required
    public class AddressController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AddressController(ApplicationDbContext context)
        {
            _context = context;
        }

        // Helper method to securely extract the User ID from the JWT
        private int GetSecureUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            throw new Exception("Unauthorized access.");
        }

        // GET: api/Address
        [HttpGet]
        public async Task<IActionResult> GetAddresses()
        {
            try
            {
                var userId = GetSecureUserId();
                var addresses = await _context.Addresses
                    .Where(a => a.UserId == userId)
                    .OrderByDescending(a => a.IsDefault) // Default address always appears first
                    .Select(a => new AddressDto
                    {
                        Id = a.Id,
                        AddressType = a.AddressType,
                        StreetLine1 = a.StreetLine1,
                        StreetLine2 = a.StreetLine2,
                        City = a.City,
                        PostalCode = a.PostalCode,
                        Country = a.Country,
                        IsDefault = a.IsDefault
                    }).ToListAsync();

                return Ok(addresses);
            }
            catch (Exception)
            {
                return Unauthorized(new { message = "Session invalid." });
            }
        }

        // POST: api/Address
        [HttpPost]
        public async Task<IActionResult> AddAddress([FromBody] AddressInputDto request)
        {
            try
            {
                var userId = GetSecureUserId();
                var existingCount = await _context.Addresses.CountAsync(a => a.UserId == userId);

                // Business Logic: If this is the user's first address, force it to be the default
                bool isDefault = request.IsDefault || existingCount == 0;

                if (isDefault)
                {
                    // Strip default status from all existing addresses
                    var existingDefaults = await _context.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
                    foreach (var addr in existingDefaults) addr.IsDefault = false;
                }

                var newAddress = new Address
                {
                    UserId = userId,
                    AddressType = request.AddressType.Trim(),
                    StreetLine1 = request.StreetLine1.Trim(),
                    StreetLine2 = request.StreetLine2?.Trim(),
                    City = request.City.Trim(),
                    PostalCode = request.PostalCode.Trim(),
                    Country = request.Country.Trim(),
                    IsDefault = isDefault
                };

                _context.Addresses.Add(newAddress);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Address added successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to add address.", details = ex.Message });
            }
        }

        // PUT: api/Address/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAddress(int id, [FromBody] AddressInputDto request)
        {
            try
            {
                var userId = GetSecureUserId();
                
                // Securely fetch the address while guaranteeing it belongs to the logged-in user
                var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                if (address == null) return NotFound(new { message = "Address not found." });

                // Business Logic: Handling default status changes
                if (request.IsDefault && !address.IsDefault)
                {
                    var existingDefaults = await _context.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
                    foreach (var addr in existingDefaults) addr.IsDefault = false;
                }

                address.AddressType = request.AddressType.Trim();
                address.StreetLine1 = request.StreetLine1.Trim();
                address.StreetLine2 = request.StreetLine2?.Trim();
                address.City = request.City.Trim();
                address.PostalCode = request.PostalCode.Trim();
                address.Country = request.Country.Trim();
                address.IsDefault = request.IsDefault;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Address updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to update address.", details = ex.Message });
            }
        }

        // DELETE: api/Address/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            try
            {
                var userId = GetSecureUserId();
                var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                
                if (address == null) return NotFound(new { message = "Address not found." });

                _context.Addresses.Remove(address);
                await _context.SaveChangesAsync();

                // Business Logic: If they deleted their default address, assign default status to the next available address
                if (address.IsDefault)
                {
                    var nextAddress = await _context.Addresses.FirstOrDefaultAsync(a => a.UserId == userId);
                    if (nextAddress != null)
                    {
                        nextAddress.IsDefault = true;
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new { message = "Address deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to delete address.", details = ex.Message });
            }
        }
    }
}