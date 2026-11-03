using Microsoft.EntityFrameworkCore;
using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Repositories;

public class TournamentRepository : Repository<Tournament>, ITournamentRepository
{
    public TournamentRepository(TournamentDbContext context) : base(context)
    {
    }

    public async Task<Tournament?> GetWithDetailsAsync(int id)
    {
        return await _context.Tournaments
            .Include(t => t.CreatedByUser)
            .Include(t => t.Teams.OrderBy(tm => tm.Seed))
            .Include(t => t.Matches)
                .ThenInclude(m => m.HomeTeam)
            .Include(t => t.Matches)
                .ThenInclude(m => m.AwayTeam)
            .Include(t => t.Matches)
                .ThenInclude(m => m.WinnerTeam)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IReadOnlyList<Tournament>> GetFilteredAsync(string? search, string? category, TournamentStatus? status)
    {
        var query = _context.Tournaments
            .Include(t => t.Teams)
            .Include(t => t.Matches)
            .Include(t => t.CreatedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim().ToLower();
            query = query.Where(t => t.Name.ToLower().Contains(search) || 
                                    (t.Location != null && t.Location.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "Tất cả")
        {
            query = query.Where(t => t.Category == category);
        }

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
    }
}

