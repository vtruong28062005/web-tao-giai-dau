using System.Text.Json.Serialization;

namespace TournamentApp.Models;

public class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }

    [JsonIgnore]
    public Tournament? Tournament { get; set; }

    public int Round { get; set; } = 1;
    public string RoundName { get; set; } = "Vòng 1";
    public int MatchNumber { get; set; } = 1;

    public int? HomeTeamId { get; set; }
    public Team? HomeTeam { get; set; }

    public int? AwayTeamId { get; set; }
    public Team? AwayTeam { get; set; }

    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }

    public int? WinnerTeamId { get; set; }
    public Team? WinnerTeam { get; set; }

    public MatchStatus Status { get; set; } = MatchStatus.Scheduled;
    public DateTime? ScheduledTime { get; set; }
    public string? Venue { get; set; }
    public string? Notes { get; set; }

    // Dành cho nhánh đấu (Bracket linkage)
    public int? NextMatchId { get; set; }
    public string? NextMatchSlot { get; set; } // "Home" hoặc "Away"

    // Vòng bảng (nếu áp dụng)
    public string? GroupName { get; set; }
}

