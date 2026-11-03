using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly TournamentDbContext _context;

    public DashboardController(TournamentDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Thống kê nhanh toàn hệ thống (Công khai)
    /// </summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var totalTournaments = await _context.Tournaments.CountAsync();
        var ongoingTournaments = await _context.Tournaments.CountAsync(t => t.Status == TournamentStatus.Ongoing);
        var totalTeams = await _context.Teams.CountAsync();
        var totalMatches = await _context.Matches.CountAsync();
        var completedMatches = await _context.Matches.CountAsync(m => m.Status == MatchStatus.Completed);

        var stats = new DashboardStatsDto(
            totalTournaments,
            ongoingTournaments,
            totalTeams,
            totalMatches,
            completedMatches
        );

        return Ok(stats);
    }
}

