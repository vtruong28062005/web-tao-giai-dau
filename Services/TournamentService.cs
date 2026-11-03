using TournamentApp.Models;
using TournamentApp.Repositories;

namespace TournamentApp.Services;

public class TournamentService : ITournamentService
{
    private readonly IUnitOfWork _unitOfWork;

    public TournamentService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> CanUserManageAsync(int tournamentId, int userId, string role)
    {
        if (role == UserRole.Admin) return true;

        var tournament = await _unitOfWork.Tournaments.GetByIdAsync(tournamentId);
        if (tournament == null) return false;

        return tournament.CreatedByUserId == userId;
    }

    public async Task<IReadOnlyList<TournamentSummaryDto>> GetTournamentsSummaryAsync(
        string? search, 
        string? category, 
        TournamentStatus? status, 
        int? currentUserId, 
        string? currentUserRole)
    {
        var tournaments = await _unitOfWork.Tournaments.GetFilteredAsync(search, category, status);

        return tournaments.Select(t =>
        {
            bool canManage = currentUserRole == UserRole.Admin || 
                             (currentUserId.HasValue && t.CreatedByUserId == currentUserId.Value);

            string creatorName = t.CreatedByUser != null ? t.CreatedByUser.FullName : "Ban Tổ Chức";

            return new TournamentSummaryDto(
                t.Id,
                t.Name,
                t.Category,
                t.Format,
                t.Status,
                t.Description,
                t.Location,
                t.StartDate,
                t.EndDate,
                t.BannerUrl,
                t.Rules,
                t.PrizePool,
                t.MaxTeams,
                t.CreatedAt,
                t.CreatedByUserId,
                creatorName,
                t.Teams.Count,
                t.Matches.Count,
                t.Matches.Count(m => m.Status == MatchStatus.Completed),
                canManage
            );
        }).ToList();
    }

    public async Task<Tournament?> GetTournamentDetailAsync(int id)
    {
        var tournament = await _unitOfWork.Tournaments.GetWithDetailsAsync(id);
        if (tournament == null) return null;

        tournament.Matches = tournament.Matches
            .OrderBy(m => m.Round)
            .ThenBy(m => m.MatchNumber)
            .ToList();

        return tournament;
    }

    public async Task<Tournament> CreateTournamentAsync(TournamentCreateDto dto, int userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Tên giải đấu không được để trống.");

        var tournament = new Tournament
        {
            Name = dto.Name.Trim(),
            Category = dto.Category,
            Format = dto.Format,
            Status = TournamentStatus.Upcoming,
            MaxTeams = dto.MaxTeams,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Location = dto.Location?.Trim(),
            PrizePool = dto.PrizePool?.Trim(),
            Rules = dto.Rules?.Trim(),
            BannerUrl = dto.BannerUrl?.Trim(),
            Description = dto.Description?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Tournaments.AddAsync(tournament);
        await _unitOfWork.CompleteAsync();

        return tournament;
    }

    public async Task<Tournament> UpdateTournamentAsync(int id, TournamentUpdateDto dto, int userId, string role)
    {
        var tournament = await _unitOfWork.Tournaments.GetByIdAsync(id);
        if (tournament == null)
            throw new KeyNotFoundException("Không tìm thấy giải đấu.");

        bool canManage = (role == UserRole.Admin) || (tournament.CreatedByUserId == userId);
        if (!canManage)
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa giải đấu của người khác.");

        tournament.Name = dto.Name.Trim();
        tournament.Category = dto.Category;
        tournament.Format = dto.Format;
        tournament.Status = dto.Status;
        tournament.MaxTeams = dto.MaxTeams;
        tournament.StartDate = dto.StartDate;
        tournament.EndDate = dto.EndDate;
        tournament.Location = dto.Location?.Trim();
        tournament.PrizePool = dto.PrizePool?.Trim();
        tournament.Rules = dto.Rules?.Trim();
        tournament.BannerUrl = dto.BannerUrl?.Trim();
        tournament.Description = dto.Description?.Trim();

        _unitOfWork.Tournaments.Update(tournament);
        await _unitOfWork.CompleteAsync();

        return tournament;
    }

    public async Task<bool> DeleteTournamentAsync(int id, int userId, string role)
    {
        var tournament = await _unitOfWork.Tournaments.GetByIdAsync(id);
        if (tournament == null)
            return false;

        bool canManage = (role == UserRole.Admin) || (tournament.CreatedByUserId == userId);
        if (!canManage)
            throw new UnauthorizedAccessException("Bạn không có quyền xóa giải đấu của người khác.");

        _unitOfWork.Tournaments.Delete(tournament);
        await _unitOfWork.CompleteAsync();

        return true;
    }
}

