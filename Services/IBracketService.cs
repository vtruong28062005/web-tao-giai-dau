using TournamentApp.Models;

namespace TournamentApp.Services;

public interface IBracketService
{
    Task<List<Match>> GenerateScheduleAsync(int tournamentId, bool shuffle = false);
    Task<Match> UpdateScoreAsync(int matchId, int homeScore, int awayScore, string? notes = null);
}

