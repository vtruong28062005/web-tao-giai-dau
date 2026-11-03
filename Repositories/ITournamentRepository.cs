using TournamentApp.Models;

namespace TournamentApp.Repositories;

public interface ITournamentRepository : IRepository<Tournament>
{
    Task<Tournament?> GetWithDetailsAsync(int id);
    Task<IReadOnlyList<Tournament>> GetFilteredAsync(string? search, string? category, TournamentStatus? status);
}

