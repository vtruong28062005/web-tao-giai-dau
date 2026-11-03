namespace TournamentApp.Models;

// Authentication DTOs
public record LoginRequest(string Username, string Password);
public record RegisterRequest(string Username, string Password, string FullName, string? Email, string? Role = UserRole.Organizer);
public record AuthResponse(int Id, string Username, string FullName, string Role, string Token);
public record UserProfileDto(int Id, string Username, string FullName, string? Email, string Role, DateTime CreatedAt);

// Tournament DTOs
public record TournamentCreateDto(
    string Name,
    string Category,
    TournamentFormat Format,
    int MaxTeams,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Location,
    string? PrizePool,
    string? Rules,
    string? BannerUrl,
    string? Description
);

public record TournamentUpdateDto(
    string Name,
    string Category,
    TournamentFormat Format,
    TournamentStatus Status,
    int MaxTeams,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Location,
    string? PrizePool,
    string? Rules,
    string? BannerUrl,
    string? Description
);

public record TournamentSummaryDto(
    int Id,
    string Name,
    string Category,
    TournamentFormat Format,
    TournamentStatus Status,
    string? Description,
    string? Location,
    DateTime? StartDate,
    DateTime? EndDate,
    string? BannerUrl,
    string? Rules,
    string? PrizePool,
    int MaxTeams,
    DateTime CreatedAt,
    int? CreatedByUserId,
    string CreatedBy,
    int TeamsCount,
    int MatchesCount,
    int CompletedMatchesCount,
    bool CanManage
);

// Team & Match DTOs
public record BulkTeamsRequest(List<string> TeamNames);
public record GenerateScheduleRequest(bool Shuffle = false);
public record UpdateScoreRequest(int HomeScore, int AwayScore, string? Notes);
public record UpdateMatchDetailsRequest(DateTime? ScheduledTime, string? Venue, string? Notes);

// Dashboard Stats DTO
public record DashboardStatsDto(
    int TotalTournaments,
    int OngoingTournaments,
    int TotalTeams,
    int TotalMatches,
    int CompletedMatches
);
