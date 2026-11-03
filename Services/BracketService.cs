using Microsoft.EntityFrameworkCore;
using TournamentApp.Data;
using TournamentApp.Models;

namespace TournamentApp.Services;

public class BracketService : IBracketService
{
    private readonly TournamentDbContext _context;

    public BracketService(TournamentDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Tạo lịch thi đấu / sơ đồ bảng đấu tùy theo thể thức giải
    /// </summary>
    public async Task<List<Match>> GenerateScheduleAsync(int tournamentId, bool shuffle = false)
    {
        var tournament = await _context.Tournaments
            .Include(t => t.Teams)
            .Include(t => t.Matches)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);

        if (tournament == null)
            throw new ArgumentException("Không tìm thấy giải đấu.");

        if (tournament.Teams.Count < 2)
            throw new InvalidOperationException("Cần tối thiểu 2 đội để tạo lịch thi đấu.");

        // Xóa các trận đấu cũ
        _context.Matches.RemoveRange(tournament.Matches);
        await _context.SaveChangesAsync();

        var teams = tournament.Teams.ToList();
        if (shuffle)
        {
            var rng = new Random();
            teams = teams.OrderBy(_ => rng.Next()).ToList();
        }
        else
        {
            teams = teams.OrderBy(t => t.Seed).ThenBy(t => t.Id).ToList();
        }

        List<Match> generatedMatches = tournament.Format switch
        {
            TournamentFormat.SingleElimination => await GenerateSingleEliminationAsync(tournament, teams),
            TournamentFormat.RoundRobin => await GenerateRoundRobinAsync(tournament, teams),
            TournamentFormat.GroupStageKnockout => await GenerateGroupStageKnockoutAsync(tournament, teams),
            _ => await GenerateSingleEliminationAsync(tournament, teams)
        };

        tournament.Status = TournamentStatus.Ongoing;
        await _context.SaveChangesAsync();

        return generatedMatches;
    }

    /// <summary>
    /// Tạo sơ đồ loại trực tiếp (Single Elimination)
    /// </summary>
    private async Task<List<Match>> GenerateSingleEliminationAsync(Tournament tournament, List<Team> teams)
    {
        int count = teams.Count;
        // Tìm lũy thừa của 2 gần nhất >= count
        int bracketSize = 2;
        while (bracketSize < count)
        {
            bracketSize *= 2;
        }

        int totalRounds = (int)Math.Log2(bracketSize);
        var matches = new List<Match>();

        int matchNumberCounter = 1;
        var roundMatches = new Dictionary<int, List<Match>>();

        // Tạo khung các trận cho từng vòng từ Round 1 đến Chung kết
        for (int r = 1; r <= totalRounds; r++)
        {
            int matchesInRound = bracketSize / (int)Math.Pow(2, r);
            string roundName = GetKnockoutRoundName(r, totalRounds);

            roundMatches[r] = new List<Match>();
            for (int m = 0; m < matchesInRound; m++)
            {
                var match = new Match
                {
                    TournamentId = tournament.Id,
                    Round = r,
                    RoundName = roundName,
                    MatchNumber = matchNumberCounter++,
                    Status = MatchStatus.Scheduled,
                    ScheduledTime = tournament.StartDate?.AddDays((r - 1) * 2).AddHours(9 + m * 2)
                };
                matches.Add(match);
                roundMatches[r].Add(match);
            }
        }

        // Tạo thêm trận tranh hạng ba nếu có từ 4 đội trở lên
        Match? thirdPlaceMatch = null;
        if (bracketSize >= 4)
        {
            thirdPlaceMatch = new Match
            {
                TournamentId = tournament.Id,
                Round = totalRounds,
                RoundName = "Tranh Hạng Ba",
                MatchNumber = matchNumberCounter++,
                Status = MatchStatus.Scheduled,
                ScheduledTime = tournament.StartDate?.AddDays((totalRounds - 1) * 2).AddHours(8)
            };
            matches.Add(thirdPlaceMatch);
        }

        // Lưu trước để có ID cho các trận đấu
        await _context.Matches.AddRangeAsync(matches);
        await _context.SaveChangesAsync();

        // Liên kết các vòng: NextMatchId & NextMatchSlot
        for (int r = 1; r < totalRounds; r++)
        {
            var currentRoundList = roundMatches[r];
            var nextRoundList = roundMatches[r + 1];

            for (int i = 0; i < currentRoundList.Count; i++)
            {
                var currentMatch = currentRoundList[i];
                var nextMatch = nextRoundList[i / 2];

                currentMatch.NextMatchId = nextMatch.Id;
                currentMatch.NextMatchSlot = (i % 2 == 0) ? "Home" : "Away";
            }
        }

        // Phân phối các đội vào Round 1
        var round1Matches = roundMatches[1];
        var seededTeams = OrderSeedsForBracket(bracketSize);

        for (int i = 0; i < round1Matches.Count; i++)
        {
            int homeSeedIndex = seededTeams[i * 2] - 1;
            int awaySeedIndex = seededTeams[i * 2 + 1] - 1;

            if (homeSeedIndex < teams.Count)
                round1Matches[i].HomeTeamId = teams[homeSeedIndex].Id;

            if (awaySeedIndex < teams.Count)
                round1Matches[i].AwayTeamId = teams[awaySeedIndex].Id;

            // Xử lý nếu có "Bye" (1 đội không có đối thủ ở Round 1)
            if (round1Matches[i].HomeTeamId != null && round1Matches[i].AwayTeamId == null)
            {
                round1Matches[i].WinnerTeamId = round1Matches[i].HomeTeamId;
                round1Matches[i].Status = MatchStatus.Completed;
                round1Matches[i].Notes = "Miễn đấu vòng 1 (Bye)";
                AdvanceWinnerToNext(round1Matches[i], roundMatches);
            }
            else if (round1Matches[i].HomeTeamId == null && round1Matches[i].AwayTeamId != null)
            {
                round1Matches[i].WinnerTeamId = round1Matches[i].AwayTeamId;
                round1Matches[i].Status = MatchStatus.Completed;
                round1Matches[i].Notes = "Miễn đấu vòng 1 (Bye)";
                AdvanceWinnerToNext(round1Matches[i], roundMatches);
            }
        }

        await _context.SaveChangesAsync();
        return matches;
    }

    private void AdvanceWinnerToNext(Match currentMatch, Dictionary<int, List<Match>> roundMatches)
    {
        if (currentMatch.NextMatchId == null || currentMatch.WinnerTeamId == null) return;
        var next = roundMatches.Values.SelectMany(x => x).FirstOrDefault(m => m.Id == currentMatch.NextMatchId);
        if (next != null)
        {
            if (currentMatch.NextMatchSlot == "Home")
                next.HomeTeamId = currentMatch.WinnerTeamId;
            else
                next.AwayTeamId = currentMatch.WinnerTeamId;
        }
    }

    /// <summary>
    /// Tạo lịch thi đấu Vòng tròn tính điểm (Round Robin) theo thuật toán Berger
    /// </summary>
    private async Task<List<Match>> GenerateRoundRobinAsync(Tournament tournament, List<Team> teams, string? groupName = null)
    {
        var matches = new List<Match>();
        var teamList = new List<Team?>(teams);

        // Nếu số đội là lẻ, thêm null (Bye)
        if (teamList.Count % 2 != 0)
        {
            teamList.Add(null);
        }

        int numTeams = teamList.Count;
        int numRounds = numTeams - 1;
        int matchesPerRound = numTeams / 2;
        int matchCounter = 1;

        for (int r = 0; r < numRounds; r++)
        {
            int roundNumber = r + 1;
            string roundTitle = groupName == null 
                ? $"Vòng {roundNumber}" 
                : $"{groupName} - Vòng {roundNumber}";

            for (int m = 0; m < matchesPerRound; m++)
            {
                var home = teamList[m];
                var away = teamList[numTeams - 1 - m];

                if (home == null || away == null) continue; // Trận nghỉ (Bye)

                // Đổi sân nhà sân khách xen kẽ
                if (r % 2 == 1)
                {
                    (home, away) = (away, home);
                }

                var match = new Match
                {
                    TournamentId = tournament.Id,
                    Round = roundNumber,
                    RoundName = roundTitle,
                    MatchNumber = matchCounter++,
                    HomeTeamId = home.Id,
                    AwayTeamId = away.Id,
                    Status = MatchStatus.Scheduled,
                    GroupName = groupName,
                    ScheduledTime = tournament.StartDate?.AddDays(r * 2).AddHours(14 + m * 2)
                };

                matches.Add(match);
            }

            // Xoay vòng mảng (giữ nguyên vị trí đầu tiên, xoay các phần tử còn lại)
            var last = teamList[^1];
            teamList.RemoveAt(numTeams - 1);
            teamList.Insert(1, last);
        }

        await _context.Matches.AddRangeAsync(matches);
        await _context.SaveChangesAsync();
        return matches;
    }

    /// <summary>
    /// Tạo giải đấu chia bảng + Knockout
    /// </summary>
    private async Task<List<Match>> GenerateGroupStageKnockoutAsync(Tournament tournament, List<Team> teams)
    {
        // Tự động phân bổ vào 2 bảng A và B (hoặc theo GroupName đã gán)
        var groups = teams.GroupBy(t => string.IsNullOrWhiteSpace(t.GroupName) ? "Bảng A" : t.GroupName).ToList();
        if (groups.Count < 2)
        {
            // Tự chia 2 bảng đều nhau
            for (int i = 0; i < teams.Count; i++)
            {
                teams[i].GroupName = (i % 2 == 0) ? "Bảng A" : "Bảng B";
            }
            await _context.SaveChangesAsync();
            groups = teams.GroupBy(t => t.GroupName!).ToList();
        }

        var allMatches = new List<Match>();
        foreach (var group in groups)
        {
            var groupMatches = await GenerateRoundRobinAsync(tournament, group.ToList(), group.Key);
            allMatches.AddRange(groupMatches);
        }

        return allMatches;
    }

    /// <summary>
    /// Cập nhật điểm số trận đấu và đẩy đội thắng lên vòng tiếp theo nếu là Knockout
    /// </summary>
    public async Task<Match> UpdateScoreAsync(int matchId, int homeScore, int awayScore, string? notes = null)
    {
        var match = await _context.Matches
            .Include(m => m.Tournament)
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null)
            throw new ArgumentException("Không tìm thấy trận đấu.");

        if (match.HomeTeamId == null || match.AwayTeamId == null)
            throw new InvalidOperationException("Chưa đủ 2 đội tham gia để cập nhật tỷ số.");

        match.HomeScore = homeScore;
        match.AwayScore = awayScore;
        match.Notes = notes ?? match.Notes;
        match.Status = MatchStatus.Completed;

        // Xác định đội thắng
        if (homeScore > awayScore)
        {
            match.WinnerTeamId = match.HomeTeamId;
        }
        else if (awayScore > homeScore)
        {
            match.WinnerTeamId = match.AwayTeamId;
        }
        else
        {
            // Knockout không được hòa -> Mặc định gán Home nếu bằng điểm hoặc ghi chú penalty
            match.WinnerTeamId = match.HomeTeamId;
            if (string.IsNullOrEmpty(match.Notes))
            {
                match.Notes = "Thắng luân lưu / Hiệp phụ";
            }
        }

        // Tự động chuyển đội thắng sang trận tiếp theo (NextMatch)
        if (match.NextMatchId != null && match.WinnerTeamId != null)
        {
            var nextMatch = await _context.Matches.FirstOrDefaultAsync(m => m.Id == match.NextMatchId);
            if (nextMatch != null)
            {
                if (match.NextMatchSlot == "Home")
                {
                    nextMatch.HomeTeamId = match.WinnerTeamId;
                }
                else
                {
                    nextMatch.AwayTeamId = match.WinnerTeamId;
                }
            }
        }

        // Kiểm tra xem đây có phải bán kết để đẩy đội thua vào tranh hạng 3 không
        if (match.Tournament != null && (match.RoundName.Contains("Bán kết", StringComparison.OrdinalIgnoreCase) || match.RoundName.Contains("Bán Kết")))
        {
            var thirdPlaceMatch = await _context.Matches
                .FirstOrDefaultAsync(m => m.TournamentId == match.TournamentId && EF.Functions.Like(m.RoundName, "%Hạng Ba%"));

            if (thirdPlaceMatch != null)
            {
                int loserId = (match.WinnerTeamId == match.HomeTeamId) ? match.AwayTeamId.Value : match.HomeTeamId.Value;
                if (thirdPlaceMatch.HomeTeamId == null)
                {
                    thirdPlaceMatch.HomeTeamId = loserId;
                }
                else if (thirdPlaceMatch.AwayTeamId == null && thirdPlaceMatch.HomeTeamId != loserId)
                {
                    thirdPlaceMatch.AwayTeamId = loserId;
                }
            }
        }

        // Kiểm tra toàn bộ giải đấu xem đã hoàn thành chưa
        var allMatches = await _context.Matches
            .Where(m => m.TournamentId == match.TournamentId)
            .ToListAsync();

        if (allMatches.All(m => m.Status == MatchStatus.Completed))
        {
            if (match.Tournament != null)
            {
                match.Tournament.Status = TournamentStatus.Completed;
            }
        }

        await _context.SaveChangesAsync();
        return match;
    }

    /// <summary>
    /// Xếp thứ tự hạt giống chuẩn cho nhánh đấu (Bracket Seeding: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6...)
    /// </summary>
    private static List<int> OrderSeedsForBracket(int numTeams)
    {
        var rounds = (int)Math.Log2(numTeams);
        var pls = new List<int> { 1, 2 };

        for (int i = 0; i < rounds - 1; i++)
        {
            var nextPls = new List<int>();
            int outCount = (int)Math.Pow(2, i + 2) + 1;
            foreach (var p in pls)
            {
                nextPls.Add(p);
                nextPls.Add(outCount - p);
            }
            pls = nextPls;
        }

        return pls;
    }

    private static string GetKnockoutRoundName(int round, int totalRounds)
    {
        int diff = totalRounds - round;
        return diff switch
        {
            0 => "Chung Kết",
            1 => "Bán Kết",
            2 => "Tứ Kết",
            3 => "Vòng 1/8 (Vòng 16)",
            4 => "Vòng 1/16 (Vòng 32)",
            _ => $"Vòng {round}"
        };
    }
}
