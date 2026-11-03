using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TournamentApp.Models;
using TournamentApp.Repositories;
using TournamentApp.Services;

namespace TournamentApp.Controllers;

[ApiController]
[Route("api/tournaments/{tournamentId:int}/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITournamentService _tournamentService;

    public TeamsController(IUnitOfWork unitOfWork, ITournamentService tournamentService)
    {
        _unitOfWork = unitOfWork;
        _tournamentService = tournamentService;
    }

    private (int? UserId, string? Role) GetCurrentUser()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? userId = int.TryParse(idStr, out int id) ? id : null;
        var role = User.FindFirstValue(ClaimTypes.Role);
        return (userId, role);
    }

    /// <summary>
    /// Thêm 1 đội vào giải đấu (Yêu cầu đăng nhập & quyền sở hữu hoặc Admin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> AddTeam(int tournamentId, [FromBody] Team team)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để thêm đội." });

        bool canManage = await _tournamentService.CanUserManageAsync(tournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền quản lý giải đấu này." });

        var tournament = await _unitOfWork.Tournaments.GetWithDetailsAsync(tournamentId);
        if (tournament == null)
            return NotFound(new { message = "Không tìm thấy giải đấu." });

        if (string.IsNullOrWhiteSpace(team.Name))
            return BadRequest(new { message = "Tên đội không được để trống." });

        if (tournament.Teams.Count >= tournament.MaxTeams)
            return BadRequest(new { message = $"Số lượng đội đã đạt mức tối đa ({tournament.MaxTeams} đội)." });

        team.TournamentId = tournamentId;
        team.Seed = tournament.Teams.Count + 1;
        team.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(team.Color)) team.Color = "#3B82F6";
        if (string.IsNullOrEmpty(team.Logo)) team.Logo = "🏆";

        await _unitOfWork.Teams.AddAsync(team);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(AddTeam), new { tournamentId, id = team.Id }, team);
    }

    /// <summary>
    /// Nhập hàng loạt đội từ danh sách (Yêu cầu đăng nhập & quyền sở hữu hoặc Admin)
    /// </summary>
    [HttpPost("bulk")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> BulkAddTeams(int tournamentId, [FromBody] BulkTeamsRequest req)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để thêm đội." });

        bool canManage = await _tournamentService.CanUserManageAsync(tournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền quản lý giải đấu này." });

        var tournament = await _unitOfWork.Tournaments.GetWithDetailsAsync(tournamentId);
        if (tournament == null)
            return NotFound(new { message = "Không tìm thấy giải đấu." });

        var colors = new[] { "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#6366F1" };
        var emojis = new[] { "⚽", "🔥", "⚡", "🦅", "🐉", "🏆", "🌟", "🎯", "🛡️", "⚔️" };

        int added = 0;
        foreach (var name in req.TeamNames)
        {
            if (string.IsNullOrWhiteSpace(name)) continue;
            if (tournament.Teams.Count >= tournament.MaxTeams) break;

            var cleanName = name.Trim();
            var team = new Team
            {
                TournamentId = tournamentId,
                Name = cleanName,
                ShortName = cleanName.Length > 3 ? cleanName.Substring(0, 3).ToUpper() : cleanName.ToUpper(),
                Seed = tournament.Teams.Count + 1,
                Color = colors[tournament.Teams.Count % colors.Length],
                Logo = emojis[tournament.Teams.Count % emojis.Length],
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Teams.AddAsync(team);
            tournament.Teams.Add(team);
            added++;
        }

        await _unitOfWork.CompleteAsync();
        return Ok(new { message = $"Đã thêm thành công {added} đội.", count = added });
    }

    /// <summary>
    /// Xóa 1 đội khỏi giải đấu (Yêu cầu đăng nhập & quyền sở hữu hoặc Admin)
    /// </summary>
    [HttpDelete("{teamId:int}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> DeleteTeam(int tournamentId, int teamId)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để xóa đội." });

        bool canManage = await _tournamentService.CanUserManageAsync(tournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền quản lý giải đấu này." });

        var team = await _unitOfWork.Teams.GetByIdAsync(teamId);
        if (team == null || team.TournamentId != tournamentId)
            return NotFound(new { message = "Không tìm thấy đội trong giải đấu này." });

        _unitOfWork.Teams.Delete(team);
        await _unitOfWork.CompleteAsync();

        return Ok(new { message = "Đã xóa đội thành công." });
    }
}

