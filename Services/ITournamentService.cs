using TournamentApp.Models;

namespace TournamentApp.Services;

public interface ITournamentService
{
    Task<IReadOnlyList<TournamentSummaryDto>> GetTournamentsSummaryAsync(
        string? search, 
        string? category, 
        TournamentStatus? status, 
        int? currentUserId, 
        string? currentUserRole);

    Task<Tournament?> GetTournamentDetailAsync(int id);
    Task<Tournament> CreateTournamentAsync(TournamentCreateDto dto, int userId);
    Task<Tournament> UpdateTournamentAsync(int id, TournamentUpdateDto dto, int userId, string role);
    Task<bool> DeleteTournamentAsync(int id, int userId, string role);
    Task<bool> CanUserManageAsync(int tournamentId, int userId, string role);
}

