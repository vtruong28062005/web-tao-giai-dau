using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TournamentApp.Data;
using TournamentApp.Repositories;
using TournamentApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình Kestrel lắng nghe port linh hoạt (Hỗ trợ cả Localhost và Cloud Docker/Render/Railway)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://*:{port}");

// 1. Cấu hình Database SQLite
builder.Services.AddDbContext<TournamentDbContext>(options =>
    options.UseSqlite("Data Source=tournaments.db"));

// 2. Đăng ký Repository & Unit of Work (Data Access Layer)
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// 3. Đăng ký Services (Business Logic Layer)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITournamentService, TournamentService>();
builder.Services.AddScoped<IBracketService, BracketService>();
builder.Services.AddScoped<IStandingsService, StandingsService>();

// 4. Cấu hình Authentication & JWT Bearer Token
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TournaPro_Super_Secret_Jwt_Security_Key_2026_DotNet10_MVC";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TournaProServer";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TournaProClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 5. Cấu hình Authorization (Phân quyền Admin / Organizer / Viewer)
builder.Services.AddAuthorization();

// 6. Cấu hình Controllers (MVC Controller Layer)
builder.Services.AddControllers();

// 7. Cho phép CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

// Khởi tạo Database nếu chưa tồn tại
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TournamentDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// Kích hoạt Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// Map MVC / API Controllers
app.MapControllers();

app.Run();
