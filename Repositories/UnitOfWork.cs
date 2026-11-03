using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly TournamentDbContext _context;

    public ITournamentRepository Tournaments { get; }
    public IUserRepository Users { get; }
    public IRepository<Team> Teams { get; }
    public IRepository<Match> Matches { get; }

    public UnitOfWork(TournamentDbContext context)
    {
        _context = context;
        Tournaments = new TournamentRepository(_context);
        Users = new UserRepository(_context);
        Teams = new Repository<Team>(_context);
        Matches = new Repository<Match>(_context);
    }

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}

