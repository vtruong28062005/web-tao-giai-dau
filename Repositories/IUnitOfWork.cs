using TournamentApp.Models;

namespace TournamentApp.Repositories;

public interface IUnitOfWork : IDisposable
{
    ITournamentRepository Tournaments { get; }
    IUserRepository Users { get; }
    IRepository<Team> Teams { get; }
    IRepository<Match> Matches { get; }

    Task<int> CompleteAsync();
}

