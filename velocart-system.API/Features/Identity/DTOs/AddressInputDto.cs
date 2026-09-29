using System.ComponentModel.DataAnnotations;

namespace velocart_system.API.DTOs
{
    public class AddressInputDto
    {
        [Required, MaxLength(50)]
        public string AddressType { get; set; } = "Home";

        [Required, MaxLength(150)]
        public string StreetLine1 { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? StreetLine2 { get; set; }

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string PostalCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Country { get; set; } = "Sri Lanka";

        public bool IsDefault { get; set; } = false;
    }
}