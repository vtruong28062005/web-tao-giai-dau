using Microsoft.EntityFrameworkCore;
using TournamentApp.Models;

namespace TournamentApp.Data;

public class TournamentDbContext : DbContext
{
    public TournamentDbContext(DbContextOptions<TournamentDbContext> options) : base(options)
    {
    }

    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User -> Tournaments (1-to-many)
        modelBuilder.Entity<Tournament>()
            .HasOne(t => t.CreatedByUser)
            .WithMany(u => u.Tournaments)
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Tournament -> Teams (1-to-many, Cascade Delete)
        modelBuilder.Entity<Tournament>()
            .HasMany(t => t.Teams)
            .WithOne(tm => tm.Tournament)
            .HasForeignKey(tm => tm.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Tournament -> Matches (1-to-many, Cascade Delete)
        modelBuilder.Entity<Tournament>()
            .HasMany(t => t.Matches)
            .WithOne(m => m.Tournament)
            .HasForeignKey(m => m.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Match -> HomeTeam & AwayTeam
        modelBuilder.Entity<Match>()
            .HasOne(m => m.HomeTeam)
            .WithMany()
            .HasForeignKey(m => m.HomeTeamId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.AwayTeam)
            .WithMany()
            .HasForeignKey(m => m.AwayTeamId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.WinnerTeam)
            .WithMany()
            .HasForeignKey(m => m.WinnerTeamId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

