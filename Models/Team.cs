using System.Text.Json.Serialization;

namespace TournamentApp.Models;

public class Team
{
    public int Id { get; set; }
    public int TournamentId { get; set; }

    [JsonIgnore]
    public Tournament? Tournament { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? Logo { get; set; } // Emoji icon or image URL
    public string? Color { get; set; } = "#3B82F6"; // Hex color badge
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? Members { get; set; } // Danh sách thành viên (cách nhau bởi dấu phẩy hoặc xuống dòng)
    public int Seed { get; set; } = 1;
    public string? GroupName { get; set; } // Ví dụ: "Bảng A", "Bảng B"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

