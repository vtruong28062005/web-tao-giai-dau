using TournamentApp.Models;

namespace TournamentApp.Services;

public interface IStandingsService
{
    Task<List<Standing>> GetStandingsAsync(int tournamentId, string? groupName = null);
}

