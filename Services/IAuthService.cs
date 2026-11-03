using TournamentApp.Models;

namespace TournamentApp.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest req);
    Task<AuthResponse> LoginAsync(LoginRequest req);
    Task<UserProfileDto?> GetUserProfileAsync(int userId);
    string GenerateJwtToken(User user);
}

