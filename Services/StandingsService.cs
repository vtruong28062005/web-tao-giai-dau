using Microsoft.EntityFrameworkCore;
using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Services;

public class StandingsService : IStandingsService
{
    private readonly TournamentDbContext _context;

    public StandingsService(TournamentDbContext context)
    {
        _context = context;
    }

    public async Task<List<Standing>> GetStandingsAsync(int tournamentId, string? groupName = null)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Teams)
            .Include(t => t.Matches)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null) return new List<Standing>();

        var teams = tournament.Teams.AsQueryable();
        if (!string.IsNullOrEmpty(groupName))
        {
            teams = teams.Where(t => t.GroupName == groupName);
        }

        var teamList = teams.ToList();
        var standingsDict = teamList.ToDictionary(
            t => t.Id,
            t => new Standing
            {
                TeamId = t.Id,
                TeamName = t.Name,
                ShortName = t.ShortName,
                Logo = t.Logo,
                Color = t.Color,
                GroupName = t.GroupName,
                Played = 0,
                Won = 0,
                Drawn = 0,
                Lost = 0,
                GoalsFor = 0,
                GoalsAgainst = 0,
                Points = 0
            });

        var matches = tournament.Matches
            .Where(m => m.Status == MatchStatus.Completed && m.HomeTeamId != null && m.AwayTeamId != null && m.HomeScore != null && m.AwayScore != null)
            .ToList();

        if (!string.IsNullOrEmpty(groupName))
        {
            matches = matches.Where(m => m.GroupName == groupName).ToList();
        }

        foreach (var m in matches)
        {
            if (!standingsDict.TryGetValue(m.HomeTeamId!.Value, out var home) ||
                !standingsDict.TryGetValue(m.AwayTeamId!.Value, out var away))
            {
                continue;
            }

            int hScore = m.HomeScore!.Value;
            int aScore = m.AwayScore!.Value;

            home.Played++;
            away.Played++;
            home.GoalsFor += hScore;
            home.GoalsAgainst += aScore;
            away.GoalsFor += aScore;
            away.GoalsAgainst += hScore;

            if (hScore > aScore)
            {
                home.Won++;
                home.Points += 3;
                away.Lost++;
            }
            else if (hScore < aScore)
            {
                away.Won++;
                away.Points += 3;
                home.Lost++;
            }
            else
            {
                home.Drawn++;
                away.Drawn++;
                home.Points += 1;
                away.Points += 1;
            }
        }

        return standingsDict.Values
            .OrderByDescending(s => s.Points)
            .ThenByDescending(s => s.GoalDifference)
            .ThenByDescending(s => s.GoalsFor)
            .ThenByDescending(s => s.Won)
            .ThenBy(s => s.TeamName)
            .ToList();
    }
}

