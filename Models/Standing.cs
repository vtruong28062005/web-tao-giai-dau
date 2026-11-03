namespace TournamentApp.Models;

public class Standing
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? Logo { get; set; }
    public string? Color { get; set; }
    public string? GroupName { get; set; }
    
    public int Played { get; set; }      // Số trận đã đấu
    public int Won { get; set; }         // Thắng
    public int Drawn { get; set; }       // Hòa
    public int Lost { get; set; }        // Thua
    public int GoalsFor { get; set; }    // Điểm/Bàn thắng ghi được
    public int GoalsAgainst { get; set;} // Điểm/Bàn thắng để thua
    public int GoalDifference => GoalsFor - GoalsAgainst; // Hiệu số
    public int Points { get; set; }      // Điểm số (Thắng: 3, Hòa: 1, Thua: 0)
}

