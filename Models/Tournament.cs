using System.Text.Json.Serialization;

namespace TournamentApp.Models;

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Bóng đá"; // Bóng đá, Esports, Cầu lông, Bóng rổ, Bóng bàn, Bida, Tennis, Cờ vua...
    public TournamentFormat Format { get; set; } = TournamentFormat.SingleElimination;
    public TournamentStatus Status { get; set; } = TournamentStatus.Upcoming;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? BannerUrl { get; set; }
    public string? Rules { get; set; }
    public string? PrizePool { get; set; }
    public int MaxTeams { get; set; } = 8;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public List<Team> Teams { get; set; } = new();
    public List<Match> Matches { get; set; } = new();
}

