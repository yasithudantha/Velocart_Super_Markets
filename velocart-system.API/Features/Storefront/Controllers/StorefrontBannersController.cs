using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using velocart_system.API.Data;
using velocart_system.API.Features.Storefront.Models;

namespace velocart_system.API.Features.Storefront.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StorefrontBannersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public StorefrontBannersController(ApplicationDbContext context) { _context = context; }

        [HttpGet]
        [AllowAnonymous] // Public for Landing Page
        public async Task<ActionResult> GetActiveBanners()
        {
            var banners = await _context.StorefrontBanners.Where(b => b.IsActive).ToListAsync();
            return Ok(banners);
        }

        [HttpPost]
        [Authorize(Roles = "MAINADMIN")] // Only Super Admin can manage storefront
        public async Task<ActionResult> CreateBanner([FromBody] StorefrontBanner banner)
        {
            _context.StorefrontBanners.Add(banner);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Banner published successfully." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "MAINADMIN")]
        public async Task<ActionResult> DeleteBanner(int id)
        {
            var banner = await _context.StorefrontBanners.FindAsync(id);
            if (banner == null) return NotFound();
            _context.StorefrontBanners.Remove(banner);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Banner removed." });
        }
    }
}