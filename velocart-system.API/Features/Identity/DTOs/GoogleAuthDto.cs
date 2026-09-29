using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.DTOs
{
    public class GoogleAuthDto
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}