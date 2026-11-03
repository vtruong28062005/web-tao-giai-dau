using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TournamentApp.Models;
using TournamentApp.Repositories;

namespace TournamentApp.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _config;
    private readonly string _jwtKey;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration config)
    {
        _unitOfWork = unitOfWork;
        _config = config;
        _jwtKey = _config["Jwt:Key"] ?? "TournaPro_Super_Secret_Jwt_Security_Key_2026_DotNet10_MVC";
        _jwtIssuer = _config["Jwt:Issuer"] ?? "TournaProServer";
        _jwtAudience = _config["Jwt:Audience"] ?? "TournaProClient";
    }

    public static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password + "_tournament_salt_2026");
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static bool VerifyPassword(string password, string hash)
    {
        var computed = HashPassword(password);
        return string.Equals(computed, hash, StringComparison.OrdinalIgnoreCase);
    }

    public string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtKey);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.GivenName, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        if (!string.IsNullOrEmpty(user.Email))
        {
            claims.Add(new(ClaimTypes.Email, user.Email));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7), // Token 7 ngày
            Issuer = _jwtIssuer,
            Audience = _jwtAudience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest req)
    {
        var username = req.Username.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(username) || username.Length < 3)
            throw new ArgumentException("Tên đăng nhập phải có ít nhất 3 ký tự.");

        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6)
            throw new ArgumentException("Mật khẩu phải có ít nhất 6 ký tự.");

        var exists = await _unitOfWork.Users.ExistsByUsernameAsync(username);
        if (exists)
            throw new InvalidOperationException("Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.");

        var fullName = string.IsNullOrWhiteSpace(req.FullName) ? username : req.FullName.Trim();
        var role = (req.Role == UserRole.Admin) ? UserRole.Admin : UserRole.Organizer;

        var user = new User
        {
            Username = username,
            PasswordHash = HashPassword(req.Password),
            FullName = fullName,
            Email = req.Email?.Trim(),
            Role = role,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.CompleteAsync();

        var token = GenerateJwtToken(user);
        user.Token = token;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        return new AuthResponse(user.Id, user.Username, user.FullName, user.Role, token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req)
    {
        var username = req.Username.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByUsernameAsync(username);
        if (user == null || !VerifyPassword(req.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Tên đăng nhập hoặc mật khẩu không chính xác.");
        }

        var token = GenerateJwtToken(user);
        user.Token = token;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        return new AuthResponse(user.Id, user.Username, user.FullName, user.Role, token);
    }

    public async Task<UserProfileDto?> GetUserProfileAsync(int userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return null;

        return new UserProfileDto(user.Id, user.Username, user.FullName, user.Email, user.Role, user.CreatedAt);
    }
}
