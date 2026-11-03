using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TournamentApp.Models;
using TournamentApp.Repositories;
using TournamentApp.Services;

namespace TournamentApp.Controllers;

[ApiController]
public class MatchesController : ControllerBase
{
    private readonly IBracketService _bracketService;
    private readonly ITournamentService _tournamentService;
    private readonly IUnitOfWork _unitOfWork;

    public MatchesController(
        IBracketService bracketService, 
        ITournamentService tournamentService, 
        IUnitOfWork unitOfWork)
    {
        _bracketService = bracketService;
        _tournamentService = tournamentService;
        _unitOfWork = unitOfWork;
    }

    private (int? UserId, string? Role) GetCurrentUser()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? userId = int.TryParse(idStr, out int id) ? id : null;
        var role = User.FindFirstValue(ClaimTypes.Role);
        return (userId, role);
    }

    /// <summary>
    /// Tự động tạo nhánh đấu / Lịch thi đấu (Yêu cầu quyền Admin hoặc Organizer của giải)
    /// </summary>
    [HttpPost("api/tournaments/{tournamentId:int}/generate-schedule")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> GenerateSchedule(int tournamentId, [FromBody] GenerateScheduleRequest? req)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để tạo nhánh đấu." });

        bool canManage = await _tournamentService.CanUserManageAsync(tournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền quản lý giải đấu này." });

        try
        {
            bool shuffle = req?.Shuffle ?? false;
            var matches = await _bracketService.GenerateScheduleAsync(tournamentId, shuffle);
            return Ok(new { message = "Đã tạo sơ đồ và lịch thi đấu thành công!", matchesCount = matches.Count });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật tỷ số trận đấu (Yêu cầu quyền Admin hoặc Organizer của giải)
    /// </summary>
    [HttpPut("api/matches/{id:int}/score")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> UpdateScore(int id, [FromBody] UpdateScoreRequest req)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để cập nhật tỷ số." });

        var match = await _unitOfWork.Matches.GetByIdAsync(id);
        if (match == null)
            return NotFound(new { message = "Không tìm thấy trận đấu." });

        bool canManage = await _tournamentService.CanUserManageAsync(match.TournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền chỉnh sửa kết quả giải đấu này." });

        try
        {
            var updated = await _bracketService.UpdateScoreAsync(id, req.HomeScore, req.AwayScore, req.Notes);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật thời gian, địa điểm, ghi chú trận đấu
    /// </summary>
    [HttpPut("api/matches/{id:int}/details")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> UpdateDetails(int id, [FromBody] UpdateMatchDetailsRequest req)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để chỉnh sửa chi tiết trận đấu." });

        var match = await _unitOfWork.Matches.GetByIdAsync(id);
        if (match == null)
            return NotFound(new { message = "Không tìm thấy trận đấu." });

        bool canManage = await _tournamentService.CanUserManageAsync(match.TournamentId, userId.Value, role);
        if (!canManage)
            return StatusCode(403, new { message = "Bạn không có quyền chỉnh sửa giải đấu này." });

        if (req.ScheduledTime.HasValue) match.ScheduledTime = req.ScheduledTime;
        if (req.Venue != null) match.Venue = req.Venue;
        if (req.Notes != null) match.Notes = req.Notes;

        _unitOfWork.Matches.Update(match);
        await _unitOfWork.CompleteAsync();

        return Ok(match);
    }
}

