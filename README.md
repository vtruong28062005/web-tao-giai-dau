# TournaPro - Nền Tảng Tạo & Quản Lý Giải Đấu Chuyên Nghiệp

Ứng dụng web toàn diện hỗ trợ tạo và điều hành giải đấu Thể thao (Bóng đá, Bóng rổ, Cầu lông, Bóng bàn, Bida...) và Thể thao điện tử (Esports: FC Online, LMHT, CS2, Valorant...).

Dự án được tái cấu trúc hoàn chỉnh theo chuẩn **Kiến trúc MVC (Model - View - Controller)** kết hợp **Repository & Unit of Work Pattern** và hệ thống **Xác thực & Phân quyền (Authentication & Authorization với JWT Bearer & RBAC)**.

---

## 🏛️ Kiến Trúc Hệ Thống Chuẩn MVC & Repository Pattern

```
d:\DuAn\Web Tạo Giải Đấu\
├── Controllers/                         # TẦNG CONTROLLER (Xử lý HTTP, Routing, Phân quyền)
│   ├── AuthController.cs                # /api/auth (Đăng ký, Đăng nhập, Profile, JWT)
│   ├── TournamentsController.cs         # /api/tournaments (CRUD giải, phân quyền Admin vs Organizer)
│   ├── TeamsController.cs               # /api/tournaments/{id}/teams (Quản lý đội)
│   ├── MatchesController.cs             # /api/matches (Tạo nhánh, cập nhật tỷ số)
│   └── DashboardController.cs           # /api/dashboard/stats (Thống kê nhanh)
│
├── Repositories/                        # TẦNG REPOSITORY (Data Access Layer - Trừu tượng hóa CSDL)
│   ├── IRepository.cs                   # Generic Repository Interface
│   ├── Repository.cs                    # Generic Repository Implementation
│   ├── ITournamentRepository.cs         # Repository giải đấu chuyên biệt
│   ├── TournamentRepository.cs          # Implementation nạp eager-loading
│   ├── IUserRepository.cs               # Repository người dùng
│   ├── UserRepository.cs                # Implementation
│   ├── IUnitOfWork.cs                   # Unit of Work Interface
│   └── UnitOfWork.cs                    # Unit of Work Implementation (Quản lý transaction)
│
├── Services/                            # TẦNG BUSINESS LOGIC (Nghiệp vụ ứng dụng)
│   ├── IAuthService.cs & AuthService.cs # Mã hóa mật khẩu SHA256 & Sinh JWT Token
│   ├── ITournamentService.cs & TournamentService.cs # Nghiệp vụ giải & Kiểm tra quyền sở hữu
│   ├── IBracketService.cs & BracketService.cs       # Thuật toán nhánh Knockout & Berger
│   └── IStandingsService.cs & StandingsService.cs   # Thuật toán tính điểm & xếp hạng
│
├── Models/                              # TẦNG MODEL (Entities & DTOs)
│   ├── Enums.cs                         # Thể thức, trạng thái, UserRole (Admin, Organizer, Viewer)
│   ├── User.cs                          # Entity Người dùng
│   ├── Tournament.cs                    # Entity Giải đấu
│   ├── Team.cs                          # Entity Đội bóng / Tuyển thủ
│   ├── Match.cs                         # Entity Trận đấu
│   ├── Standing.cs                      # Model Bảng xếp hạng
│   └── Dtos.cs                          # Data Transfer Objects
│
├── Data/
│   └── TournamentDbContext.cs           # EF Core SQLite Context
│
├── wwwroot/                             # TẦNG VIEW (Single Page Application)
│   ├── index.html                       # Giao diện chính (Dark mode, Modals, Bracket canvas)
│   ├── css/style.css                    # CSS Connectors, Glassmorphism
│   └── js/
│       ├── api.js                       # HTTP Client tự động đính kèm JWT Bearer
│       ├── bracket.js                   # Render nhánh đấu & chế độ xem
│       └── app.js                       # Quản lý trạng thái, tabs, modals
│
└── Program.cs                           # Cấu hình JWT, Controllers, DI Services & Middleware
```

---

## 🔐 Phân Quyền (Authentication & Authorization - RBAC)

Hệ thống sử dụng chuẩn công nghiệp **JWT Bearer Token** (`[Authorize]`, `[Authorize(Roles = "...")]`):

1. **Quản Trị Viên (Role: `Admin`)**:
   - Toàn quyền hệ thống.
   - Có thể xem, chỉnh sửa, xóa bất kỳ giải đấu nào.
   - Quản lý danh sách đội và cập nhật điểm số tất cả trận đấu.

2. **Ban Tổ Chức (Role: `Organizer`)**:
   - Tạo giải đấu mới.
   - Toàn quyền quản lý, thêm/xóa đội, sinh nhánh đấu, cập nhật điểm số trên **các giải đấu do chính mình tạo ra**.
   - Khi xem giải đấu của người khác: Chỉ có quyền xem như Khán giả (nếu cố tình chỉnh sửa qua API sẽ nhận mã lỗi `403 Forbidden`).

3. **Khán Giả / Người Xem (Role: `Viewer` hoặc Chưa đăng nhập)**:
   - Theo dõi danh sách giải đấu công khai.
   - Mở xem trực tiếp giải đấu qua liên kết chia sẻ (`?share={id}`) ở **Chế độ người xem (Spectator Mode)**.
   - Không thể sửa điểm, không thể xóa giải hay thêm/xóa đội.

---

## 🚀 Hướng Dẫn Chạy Ứng Dụng

### Cách 1: Chạy bằng file `run.bat`
Click đúp vào file `run.bat` trong thư mục dự án.

### Cách 2: Chạy bằng Terminal
```bash
dotnet run
```

Sau đó mở trình duyệt truy cập:
👉 **http://localhost:5000**
