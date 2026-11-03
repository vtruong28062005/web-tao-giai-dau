using Microsoft.EntityFrameworkCore;
using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(TournamentDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.Trim().ToLower());
    }

    public async Task<User?> GetByTokenAsync(string token)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Token == token);
    }

    public async Task<bool> ExistsByUsernameAsync(string username)
    {
        return await _context.Users.AnyAsync(u => u.Username.ToLower() == username.Trim().ToLower());
    }
}

