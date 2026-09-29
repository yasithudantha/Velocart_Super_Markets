namespace velocart_system.API.DTOs
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string AccountStatus { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        
        // NEW: Preferences for the frontend UI
        public bool ReceiveNotifications { get; set; }
        public string CommunicationPreference { get; set; } = string.Empty;
        public string SavedShoppingPreferences { get; set; } = string.Empty;
    }
}