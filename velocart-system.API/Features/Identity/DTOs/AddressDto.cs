namespace velocart_system.API.DTOs
{
    public class AddressDto
    {
        public int Id { get; set; }
        public string AddressType { get; set; } = string.Empty;
        public string StreetLine1 { get; set; } = string.Empty;
        public string? StreetLine2 { get; set; }
        public string City { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
    }
}