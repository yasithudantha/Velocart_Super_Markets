using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace velocart_system.API.Models
{
    public class Address
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        // Prevents circular JSON reference errors when returning data
        [JsonIgnore]
        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required, MaxLength(50)]
        public string AddressType { get; set; } = "Home"; // e.g., Home, Office, Other

        [Required, MaxLength(150)]
        public string StreetLine1 { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? StreetLine2 { get; set; } // Optional suite/apt number

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string PostalCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Country { get; set; } = "Sri Lanka"; // Default setting

        public bool IsDefault { get; set; } = false; // Primary delivery address marker
    }
}