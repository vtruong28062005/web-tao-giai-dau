using TournamentApp.Models;

namespace TournamentApp.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByTokenAsync(string token);
    Task<bool> ExistsByUsernameAsync(string username);
}

