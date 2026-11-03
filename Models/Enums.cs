namespace TournamentApp.Models;

public enum TournamentFormat
{
    SingleElimination = 0,    // Loại trực tiếp
    RoundRobin = 1,           // Vòng tròn tính điểm
    GroupStageKnockout = 2    // Chia bảng + Knockout
}

public enum TournamentStatus
{
    Upcoming = 0,    // Sắp diễn ra
    Ongoing = 1,     // Đang diễn ra
    Completed = 2    // Đã kết thúc
}

public enum MatchStatus
{
    Scheduled = 0,   // Chưa đấu
    Live = 1,        // Đang thi đấu
    Completed = 2,   // Đã kết thúc
    Postponed = 3    // Bị hoãn
}

public static class UserRole
{
    public const string Admin = "Admin";
    public const string Organizer = "Organizer";
    public const string Viewer = "Viewer";
}
