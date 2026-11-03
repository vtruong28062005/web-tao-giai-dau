using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TournamentApp.Models;
using TournamentApp.Services;

namespace TournamentApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TournamentsController : ControllerBase
{
    private readonly ITournamentService _tournamentService;
    private readonly IStandingsService _standingsService;

    public TournamentsController(ITournamentService tournamentService, IStandingsService standingsService)
    {
        _tournamentService = tournamentService;
        _standingsService = standingsService;
    }

    private (int? UserId, string? Role) GetCurrentUser()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? userId = int.TryParse(idStr, out int id) ? id : null;
        var role = User.FindFirstValue(ClaimTypes.Role);
        return (userId, role);
    }

    /// <summary>
    /// Danh sách giải đấu (Công khai cho mọi người xem)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] TournamentStatus? status)
    {
        var (userId, role) = GetCurrentUser();
        var tournaments = await _tournamentService.GetTournamentsSummaryAsync(search, category, status, userId, role);
        return Ok(tournaments);
    }

    /// <summary>
    /// Chi tiết 1 giải đấu (Công khai cho người xem và ban tổ chức)
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var tournament = await _tournamentService.GetTournamentDetailAsync(id);
        if (tournament == null)
            return NotFound(new { message = "Không tìm thấy giải đấu." });

        return Ok(tournament);
    }

    /// <summary>
    /// Tạo giải đấu mới (Yêu cầu đăng nhập: Admin hoặc Organizer)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> Create([FromBody] TournamentCreateDto dto)
    {
        var (userId, _) = GetCurrentUser();
        if (!userId.HasValue)
            return Unauthorized(new { message = "Vui lòng đăng nhập để tạo giải đấu." });

        try
        {
            var created = await _tournamentService.CreateTournamentAsync(dto, userId.Value);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật giải đấu (Chỉ chủ giải hoặc Admin)
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> Update(int id, [FromBody] TournamentUpdateDto dto)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để chỉnh sửa giải đấu." });

        try
        {
            var updated = await _tournamentService.UpdateTournamentAsync(id, dto, userId.Value, role);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa giải đấu (Chỉ chủ giải hoặc Admin)
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Organizer}")]
    public async Task<IActionResult> Delete(int id)
    {
        var (userId, role) = GetCurrentUser();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return Unauthorized(new { message = "Vui lòng đăng nhập để xóa giải đấu." });

        try
        {
            var success = await _tournamentService.DeleteTournamentAsync(id, userId.Value, role);
            if (!success)
                return NotFound(new { message = "Không tìm thấy giải đấu." });

            return Ok(new { message = "Đã xóa giải đấu thành công." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bảng xếp hạng (Công khai cho mọi người xem)
    /// </summary>
    [HttpGet("{id:int}/standings")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStandings(int id, [FromQuery] string? groupName)
    {
        var standings = await _standingsService.GetStandingsAsync(id, groupName);
        return Ok(standings);
    }
}

