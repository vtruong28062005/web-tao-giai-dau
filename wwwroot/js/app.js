// Main Application Controller with Authentication & Shareable Viewer Mode
const App = {
    state: {
        view: 'tournaments', // 'tournaments' | 'detail'
        tournaments: [],
        activeTournament: null,
        activeTab: 'bracket',
        standings: [],
        filters: {
            category: 'Tất cả',
            status: '',
            search: ''
        },
        currentEditingMatch: null,
        isViewerMode: false,
        autoRefreshInterval: null
    },

    async init() {
        this.updateAuthUI();
        this.bindEvents();
        await this.loadDashboardStats();

        // Kiểm tra xem URL có tham số chia sẻ không (?share=1 hoặc ?id=1)
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share') || urlParams.get('id');

        if (shareId) {
            const tournamentId = parseInt(shareId, 10);
            if (!isNaN(tournamentId)) {
                await this.openTournamentDetail(tournamentId, 'bracket', true);
                return;
            }
        }

        await this.loadTournaments();
    },

    bindEvents() {
        // Search & Filters
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.state.filters.search = e.target.value;
                    this.loadTournaments();
                }, 300);
            });
        }

        // Category filter buttons
        document.querySelectorAll('[data-category-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-category-filter]').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white');
                    b.classList.add('bg-slate-800', 'text-slate-300');
                });
                btn.classList.remove('bg-slate-800', 'text-slate-300');
                btn.classList.add('bg-indigo-600', 'text-white');

                this.state.filters.category = btn.getAttribute('data-category-filter');
                this.loadTournaments();
            });
        });

        // Status filter select
        const statusSelect = document.getElementById('status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.state.filters.status = e.target.value;
                this.loadTournaments();
            });
        }
    },

    // ==========================================
    // AUTHENTICATION UI & METHODS
    // ==========================================

    updateAuthUI() {
        const user = API.getCurrentUser();
        const guestSection = document.getElementById('auth-guest-section');
        const userSection = document.getElementById('auth-user-section');

        if (user && API.isLoggedIn()) {
            guestSection?.classList.add('hidden');
            userSection?.classList.remove('hidden');

            const displayName = document.getElementById('user-display-name');
            const avatarInitial = document.getElementById('user-avatar-initial');
            const roleBadge = document.getElementById('user-role-badge');

            if (displayName) displayName.textContent = user.fullName || user.username;
            if (avatarInitial) avatarInitial.textContent = (user.fullName || user.username || 'U')[0].toUpperCase();
            if (roleBadge) {
                if (user.role === 'Admin') {
                    roleBadge.textContent = '● Quản Trị Viên (Admin)';
                    roleBadge.className = 'text-[10px] text-amber-400 font-bold';
                } else {
                    roleBadge.textContent = '● Ban Tổ Chức (Organizer)';
                    roleBadge.className = 'text-[10px] text-emerald-400 font-medium';
                }
            }
        } else {
            guestSection?.classList.remove('hidden');
            userSection?.classList.add('hidden');
        }
    },

    openAuthModal(tab = 'login') {
        this.switchAuthTab(tab);
        document.getElementById('auth-modal')?.classList.remove('hidden');
    },

    closeAuthModal() {
        document.getElementById('auth-modal')?.classList.add('hidden');
    },

    switchAuthTab(tab) {
        const loginBtn = document.getElementById('auth-tab-login');
        const regBtn = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const title = document.getElementById('auth-modal-title');

        if (tab === 'login') {
            loginBtn?.classList.add('text-indigo-400', 'border-b-2', 'border-indigo-500', 'font-bold');
            loginBtn?.classList.remove('text-slate-400', 'font-semibold');
            regBtn?.classList.remove('text-indigo-400', 'border-b-2', 'border-indigo-500', 'font-bold');
            regBtn?.classList.add('text-slate-400', 'font-semibold');

            loginForm?.classList.remove('hidden');
            regForm?.classList.add('hidden');
            if (title) title.textContent = 'Đăng Nhập Ban Tổ Chức';
        } else {
            regBtn?.classList.add('text-indigo-400', 'border-b-2', 'border-indigo-500', 'font-bold');
            regBtn?.classList.remove('text-slate-400', 'font-semibold');
            loginBtn?.classList.remove('text-indigo-400', 'border-b-2', 'border-indigo-500', 'font-bold');
            loginBtn?.classList.add('text-slate-400', 'font-semibold');

            regForm?.classList.remove('hidden');
            loginForm?.classList.add('hidden');
            if (title) title.textContent = 'Đăng Ký Tài Khoản Mới';
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const user = await API.login(username, password);
            this.updateAuthUI();
            this.closeAuthModal();
            this.showToast(`Chào mừng ${user.fullName || user.username} đã đăng nhập!`, 'success');

            if (this.state.view === 'detail' && this.state.activeTournament) {
                // Refresh detail with full edit rights
                await this.openTournamentDetail(this.state.activeTournament.id, this.state.activeTab, false);
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const fullName = document.getElementById('reg-fullname').value;
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role')?.value || 'Organizer';

        try {
            const user = await API.register(username, password, fullName, email, role);
            this.updateAuthUI();
            this.closeAuthModal();
            this.showToast(`Đăng ký thành công! Chào mừng ${user.fullName} (${user.role}).`, 'success');
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    handleLogout() {
        API.logout();
        this.updateAuthUI();
        this.showToast('Đã đăng xuất tài khoản.', 'info');
        if (this.state.view === 'detail' && this.state.activeTournament) {
            this.openTournamentDetail(this.state.activeTournament.id, this.state.activeTab, true);
        }
    },

    // ==========================================
    // SHAREABLE VIEWER LINK METHODS
    // ==========================================

    openShareModal() {
        const t = this.state.activeTournament;
        if (!t) return;

        // Sinh link công khai cho người xem
        const shareUrl = `${window.location.origin}/?share=${t.id}`;
        const input = document.getElementById('share-url-input');
        if (input) input.value = shareUrl;

        const copyBtnText = document.getElementById('copy-btn-text');
        if (copyBtnText) copyBtnText.textContent = 'Sao Chép';

        document.getElementById('share-modal')?.classList.remove('hidden');
    },

    closeShareModal() {
        document.getElementById('share-modal')?.classList.add('hidden');
    },

    copyShareUrl() {
        const input = document.getElementById('share-url-input');
        if (!input) return;

        input.select();
        input.setSelectionRange(0, 99999); // Mobile
        navigator.clipboard.writeText(input.value).then(() => {
            const copyBtnText = document.getElementById('copy-btn-text');
            if (copyBtnText) copyBtnText.textContent = 'Đã Chép!';
            this.showToast('Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!', 'success');
        }).catch(() => {
            // Fallback
            document.execCommand('copy');
            this.showToast('Đã sao chép liên kết!', 'success');
        });
    },

    openShareUrlInNewTab() {
        const input = document.getElementById('share-url-input');
        if (input && input.value) {
            window.open(input.value, '_blank');
        }
    },

    async refreshTournamentData() {
        if (!this.state.activeTournament) return;
        try {
            const tournament = await API.getTournament(this.state.activeTournament.id);
            this.state.activeTournament = tournament;
            await this.switchTab(this.state.activeTab);
            this.showToast('Đã cập nhật dữ liệu mới nhất!', 'info');
        } catch (err) {
            console.error('Lỗi khi làm mới:', err);
        }
    },

    // ==========================================
    // DASHBOARD & TOURNAMENTS LIST
    // ==========================================

    async loadDashboardStats() {
        try {
            const stats = await API.getDashboardStats();
            document.getElementById('stat-total-tournaments').textContent = stats.totalTournaments;
            document.getElementById('stat-ongoing-tournaments').textContent = stats.ongoingTournaments;
            document.getElementById('stat-total-teams').textContent = stats.totalTeams;
            document.getElementById('stat-total-matches').textContent = `${stats.completedMatches}/${stats.totalMatches}`;
        } catch (err) {
            console.error('Lỗi khi tải thống kê:', err);
        }
    },

    async loadTournaments() {
        const container = document.getElementById('tournaments-container');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400">
                <i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-indigo-500"></i>
                <p>Đang tải danh sách giải đấu...</p>
            </div>
        `;

        try {
            const tournaments = await API.getTournaments(this.state.filters);
            this.state.tournaments = tournaments;

            if (tournaments.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-8">
                        <i class="fa-solid fa-trophy text-5xl mb-4 text-slate-700"></i>
                        <h3 class="text-xl font-bold text-slate-300 mb-2">Không tìm thấy giải đấu phù hợp</h3>
                        <p class="text-slate-400 max-w-md mx-auto mb-6 text-sm">
                            Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Tạo Giải Đấu" để bắt đầu!
                        </p>
                        <button onclick="App.openCreateTournamentModal()" class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-600/30">
                            <i class="fa-solid fa-plus mr-2"></i> Tạo Giải Đấu Ngay
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = tournaments.map(t => this.renderTournamentCard(t)).join('');
        } catch (err) {
            container.innerHTML = `
                <div class="col-span-full p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-center">
                    <p class="font-bold mb-1">Không thể kết nối đến máy chủ!</p>
                    <p class="text-sm">${err.message}</p>
                </div>
            `;
        }
    },

    renderTournamentCard(t) {
        const formatNames = {
            0: 'Loại Trực Tiếp (Knockout)',
            1: 'Vòng Tròn Tính Điểm',
            2: 'Chia Bảng + Knockout'
        };

        const statusBadges = {
            0: '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><i class="fa-regular fa-clock mr-1"></i>Sắp diễn ra</span>',
            1: '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"><i class="fa-solid fa-circle text-[8px] mr-1 text-emerald-400"></i>Đang diễn ra</span>',
            2: '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20"><i class="fa-solid fa-check mr-1"></i>Đã kết thúc</span>'
        };

        const sportIcons = {
            'Bóng đá': '⚽',
            'Esports': '🎮',
            'Cầu lông': '🏸',
            'Bóng rổ': '🏀',
            'Bóng bàn': '🏓',
            'Bida': '🎱',
            'Tennis': '🎾',
            'Cờ vua': '♟️'
        };

        const icon = sportIcons[t.category] || '🏆';
        const progressPercent = t.matchesCount > 0 ? Math.round((t.completedMatchesCount / t.matchesCount) * 100) : 0;
        const banner = t.bannerUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80';

        const dateRange = (t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : 'TBD') +
            (t.endDate ? ` - ${new Date(t.endDate).toLocaleDateString('vi-VN')}` : '');

        const canManage = t.canManage ?? API.isLoggedIn();

        return `
            <div class="glass-panel glow-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col transition-all duration-300">
                <!-- Card Header / Banner -->
                <div class="relative h-44 overflow-hidden group">
                    <img src="${banner}" alt="${t.name}" class="w-full h-full object-cover transition duration-500 group-hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80'">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                    
                    <!-- Top Category & Status Badges -->
                    <div class="absolute top-3 left-3 right-3 flex justify-between items-center">
                        <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900/80 backdrop-blur text-indigo-300 border border-slate-700/60">
                            ${icon} ${t.category}
                        </span>
                        ${statusBadges[t.status] || ''}
                    </div>

                    <!-- Title on image bottom -->
                    <div class="absolute bottom-3 left-3 right-3">
                        <h3 class="text-lg font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition">${t.name}</h3>
                        <p class="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                            <i class="fa-solid fa-diagram-project text-indigo-400"></i> ${formatNames[t.format] || 'Giải đấu'}
                        </p>
                    </div>
                </div>

                <!-- Card Body -->
                <div class="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div class="space-y-2 text-xs text-slate-300">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-location-dot w-4 text-slate-400"></i>
                            <span class="truncate">${t.location || 'Chưa cập nhật địa điểm'}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-regular fa-calendar w-4 text-slate-400"></i>
                            <span>${dateRange}</span>
                        </div>
                    </div>

                    <!-- Progress & Stats -->
                    <div class="space-y-1.5 pt-2 border-t border-slate-800">
                        <div class="flex justify-between text-xs">
                            <span class="text-slate-400">Tiến độ thi đấu</span>
                            <span class="font-mono text-indigo-400 font-semibold">${t.completedMatchesCount}/${t.matchesCount} trận (${progressPercent}%)</span>
                        </div>
                        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>

                    <!-- Card Actions -->
                    <div class="flex items-center gap-2 pt-1">
                        <button onclick="App.openTournamentDetail(${t.id})" class="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20">
                            <i class="fa-solid fa-sitemap"></i> Xem Bảng Đấu
                        </button>
                        ${canManage ? `
                            <button onclick="App.openEditTournamentModal(${t.id})" title="Chỉnh sửa giải" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="App.confirmDeleteTournament(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Xóa giải" class="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white text-xs rounded-xl transition">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // TOURNAMENT DETAIL & VIEWER LOGIC
    // ==========================================

    async openTournamentDetail(id, tab = 'bracket', forceViewer = false) {
        try {
            document.getElementById('loading-overlay')?.classList.remove('hidden');
            const tournament = await API.getTournament(id);
            this.state.activeTournament = tournament;
            this.state.activeTab = tab;
            this.state.view = 'detail';

            // Phân quyền: Người xem nếu forceViewer = true HOẶC chưa đăng nhập HOẶC không phải chủ giải/Admin
            const currentUser = API.getCurrentUser();
            const isOwnerOrAdmin = currentUser && (currentUser.role === 'Admin' || tournament.createdByUserId === currentUser.id);
            this.state.isViewerMode = forceViewer || !isOwnerOrAdmin;

            // Chuyển view
            document.getElementById('tournaments-list-view')?.classList.add('hidden');
            document.getElementById('tournament-detail-view')?.classList.remove('hidden');

            this.renderDetailHeader();
            await this.switchTab(tab);

            // Cập nhật URL trình duyệt (nhưng không tải lại trang)
            const newUrl = `${window.location.pathname}?share=${id}`;
            window.history.replaceState({ tournamentId: id }, '', newUrl);

        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }
    },

    backToTournamentsList() {
        this.state.view = 'tournaments';
        document.getElementById('tournament-detail-view')?.classList.add('hidden');
        document.getElementById('tournaments-list-view')?.classList.remove('hidden');

        // Khôi phục URL sạch
        window.history.replaceState({}, '', window.location.pathname);

        this.loadTournaments();
        this.loadDashboardStats();
    },

    renderDetailHeader() {
        const t = this.state.activeTournament;
        if (!t) return;

        const isViewer = this.state.isViewerMode;

        // Spectator Banner & Organizer Controls
        const viewerBanner = document.getElementById('viewer-mode-banner');
        const organizerControls = document.getElementById('organizer-controls');
        const addTeamBtn = document.getElementById('add-team-btn');
        const instructionText = document.getElementById('bracket-instruction-text');

        if (isViewer) {
            viewerBanner?.classList.remove('hidden');
            organizerControls?.classList.add('hidden');
            addTeamBtn?.classList.add('hidden');
            if (instructionText) {
                instructionText.innerHTML = 'Đang xem ở <strong>chế độ người xem</strong>. Bấm vào trận đấu để xem chi tiết kết quả.';
            }
        } else {
            viewerBanner?.classList.add('hidden');
            organizerControls?.classList.remove('hidden');
            addTeamBtn?.classList.remove('hidden');
            if (instructionText) {
                instructionText.innerHTML = 'Bấm vào thẻ trận đấu bất kỳ để mở bảng <strong>nhập tỷ số</strong> và tự động đẩy đội thắng lên vòng sau.';
            }
        }

        const formatNames = {
            0: 'Loại Trực Tiếp (Knockout)',
            1: 'Vòng Tròn Tính Điểm',
            2: 'Chia Bảng + Knockout'
        };

        const statusBadges = {
            0: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"><i class="fa-regular fa-clock mr-1.5"></i>Sắp diễn ra</span>',
            1: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"><i class="fa-solid fa-circle text-[8px] mr-1.5 text-emerald-400"></i>Đang diễn ra</span>',
            2: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/40"><i class="fa-solid fa-check mr-1.5"></i>Đã kết thúc</span>'
        };

        document.getElementById('detail-title').textContent = t.name;
        document.getElementById('detail-category-badge').innerHTML = `<i class="fa-solid fa-tag text-indigo-400 mr-1"></i> ${t.category}`;
        document.getElementById('detail-format-badge').innerHTML = `<i class="fa-solid fa-sitemap text-cyan-400 mr-1"></i> ${formatNames[t.format]}`;
        document.getElementById('detail-status-badge').innerHTML = statusBadges[t.status] || '';
        document.getElementById('detail-location').textContent = t.location || 'Chưa cập nhật địa điểm';

        const organizerName = t.createdByUser ? t.createdByUser.fullName : 'Ban Tổ Chức';
        document.getElementById('detail-organizer').textContent = organizerName;

        const dateRange = (t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : 'TBD') +
            (t.endDate ? ` - ${new Date(t.endDate).toLocaleDateString('vi-VN')}` : '');
        document.getElementById('detail-dates').textContent = dateRange;

        if (t.prizePool) {
            document.getElementById('detail-prizepool-box').classList.remove('hidden');
            document.getElementById('detail-prizepool').textContent = t.prizePool;
        } else {
            document.getElementById('detail-prizepool-box').classList.add('hidden');
        }

        // Điều chỉnh hiển thị Tabs theo thể thức
        const bracketTabBtn = document.getElementById('tab-btn-bracket');
        const standingsTabBtn = document.getElementById('tab-btn-standings');

        if (t.format === 1) { // Round robin
            bracketTabBtn?.classList.add('hidden');
            standingsTabBtn?.classList.remove('hidden');
            if (this.state.activeTab === 'bracket') this.state.activeTab = 'standings';
        } else if (t.format === 0) { // Single elimination
            bracketTabBtn?.classList.remove('hidden');
            standingsTabBtn?.classList.add('hidden');
        } else { // Group + knockout
            bracketTabBtn?.classList.remove('hidden');
            standingsTabBtn?.classList.remove('hidden');
        }
    },

    async switchTab(tabName) {
        this.state.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('[data-detail-tab]').forEach(btn => {
            const current = btn.getAttribute('data-detail-tab');
            if (current === tabName) {
                btn.classList.add('text-indigo-400', 'border-indigo-500', 'bg-slate-800/60');
                btn.classList.remove('text-slate-400', 'border-transparent');
            } else {
                btn.classList.remove('text-indigo-400', 'border-indigo-500', 'bg-slate-800/60');
                btn.classList.add('text-slate-400', 'border-transparent');
            }
        });

        // Hide all tab panes
        document.querySelectorAll('.detail-tab-pane').forEach(pane => pane.classList.add('hidden'));

        // Show active pane
        const activePane = document.getElementById(`tab-pane-${tabName}`);
        if (activePane) activePane.classList.remove('hidden');

        // Render tab content
        const t = this.state.activeTournament;
        if (!t) return;

        const canEdit = !this.state.isViewerMode && API.isLoggedIn();

        if (tabName === 'bracket') {
            BracketRenderer.renderBracket(t.matches, t.teams, 'bracket-canvas', (match, isEditable) => {
                if (isEditable) {
                    this.openScoreModal(match);
                } else {
                    this.openMatchViewModal(match);
                }
            }, canEdit);
        } else if (tabName === 'matches') {
            this.renderMatchesList();
        } else if (tabName === 'standings') {
            await this.renderStandings();
        } else if (tabName === 'teams') {
            this.renderTeamsGrid();
        } else if (tabName === 'info') {
            this.renderInfoPane();
        }
    },

    renderMatchesList() {
        const container = document.getElementById('matches-list-container');
        if (!container) return;

        const matches = this.state.activeTournament.matches;
        if (!matches || matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-slate-400">
                    <i class="fa-regular fa-calendar-xmark text-5xl mb-4 text-slate-600"></i>
                    <p class="text-lg font-medium">Chưa có trận đấu nào</p>
                    <p class="text-sm mt-1 text-slate-500">${this.state.isViewerMode ? 'Ban tổ chức chưa công bố lịch thi đấu.' : 'Bấm "Sinh Nhánh Đấu" ở trên để tạo lịch tự động.'}</p>
                </div>
            `;
            return;
        }

        const canEdit = !this.state.isViewerMode && API.isLoggedIn();

        // Nhóm trận theo Round
        const roundsMap = {};
        matches.forEach(m => {
            const key = m.roundName || `Vòng ${m.round}`;
            if (!roundsMap[key]) roundsMap[key] = [];
            roundsMap[key].push(m);
        });

        let html = '<div class="space-y-8">';
        for (const [roundName, roundMatches] of Object.entries(roundsMap)) {
            html += `
                <div>
                    <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <h4 class="text-base font-bold text-slate-200 uppercase tracking-wider">${roundName}</h4>
                        <span class="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full ml-auto">${roundMatches.length} trận</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            `;

            roundMatches.forEach(m => {
                const isCompleted = m.status === 2;
                const home = m.homeTeam;
                const away = m.awayTeam;

                const homeScore = m.homeScore !== null ? m.homeScore : '-';
                const awayScore = m.awayScore !== null ? m.awayScore : '-';

                const timeStr = m.scheduledTime ? new Date(m.scheduledTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa định giờ';

                html += `
                    <div class="glass-panel p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3">
                        <div class="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                            <span class="font-mono text-indigo-400 font-semibold">Trận #${m.matchNumber}</span>
                            <span><i class="fa-regular fa-clock mr-1"></i>${timeStr}</span>
                            ${isCompleted 
                                ? '<span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">Xong</span>' 
                                : '<span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">Chưa đấu</span>'}
                        </div>

                        <!-- Match Teams -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">${home ? (home.logo || '⚽') : '❓'}</span>
                                    <span class="text-sm font-semibold ${m.winnerTeamId === m.homeTeamId && isCompleted ? 'text-indigo-300 font-bold' : (home ? 'text-slate-200' : 'text-slate-500 italic')}">
                                        ${home ? home.name : 'Chờ xác định'}
                                    </span>
                                </div>
                                <span class="font-mono text-base px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">${homeScore}</span>
                            </div>

                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">${away ? (away.logo || '⚽') : '❓'}</span>
                                    <span class="text-sm font-semibold ${m.winnerTeamId === m.awayTeamId && isCompleted ? 'text-indigo-300 font-bold' : (away ? 'text-slate-200' : 'text-slate-500 italic')}">
                                        ${away ? away.name : 'Chờ xác định'}
                                    </span>
                                </div>
                                <span class="font-mono text-base px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">${awayScore}</span>
                            </div>
                        </div>

                        <!-- Action -->
                        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span class="text-xs text-slate-400 truncate max-w-[200px]">
                                ${m.notes ? `<i class="fa-solid fa-tag text-[10px] mr-1"></i>${m.notes}` : (m.venue ? `<i class="fa-solid fa-location-dot text-[10px] mr-1"></i>${m.venue}` : '')}
                            </span>
                            ${canEdit ? `
                                <button onclick="App.openScoreModalById(${m.id})" class="px-3 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1">
                                    <i class="fa-solid fa-pen-to-square text-[10px]"></i> Nhập tỷ số
                                </button>
                            ` : `
                                <button onclick="App.openMatchViewById(${m.id})" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1">
                                    <i class="fa-solid fa-eye text-[10px]"></i> Chi tiết
                                </button>
                            `}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }
        html += '</div>';

        container.innerHTML = html;
    },

    async renderStandings() {
        const container = document.getElementById('standings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-indigo-500"></i>
                <p>Đang tính toán bảng xếp hạng...</p>
            </div>
        `;

        try {
            const standings = await API.getStandings(this.state.activeTournament.id);
            this.state.standings = standings;

            if (standings.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 text-slate-400">
                        <i class="fa-solid fa-table-list text-4xl mb-3 text-slate-600"></i>
                        <p>Chưa có dữ liệu bảng xếp hạng.</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="overflow-x-auto rounded-xl border border-slate-800">
                    <table class="w-full text-left standings-table">
                        <thead>
                            <tr>
                                <th class="w-12 text-center">Hạng</th>
                                <th>Đội Bóng</th>
                                <th class="text-center">Trận</th>
                                <th class="text-center">Thắng</th>
                                <th class="text-center">Hòa</th>
                                <th class="text-center">Thua</th>
                                <th class="text-center">BT</th>
                                <th class="text-center">BB</th>
                                <th class="text-center">HS</th>
                                <th class="text-center text-indigo-400 font-bold">Điểm</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            standings.forEach((s, idx) => {
                const rank = idx + 1;
                let rankBadge = `<span class="font-mono font-bold text-slate-400">${rank}</span>`;
                if (rank === 1) {
                    rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">1</span>`;
                } else if (rank === 2) {
                    rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold text-xs border border-slate-300/40">2</span>`;
                } else if (rank === 3) {
                    rankBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 font-bold text-xs border border-amber-700/40">3</span>`;
                }

                html += `
                    <tr class="transition ${rank <= 2 ? 'bg-indigo-950/10' : ''}">
                        <td class="text-center">${rankBadge}</td>
                        <td>
                            <div class="flex items-center gap-2.5">
                                <span class="text-xl">${s.logo || '⚽'}</span>
                                <div>
                                    <div class="font-bold text-slate-200">${s.teamName}</div>
                                    ${s.shortName ? `<span class="text-[11px] text-slate-400 font-mono">${s.shortName}</span>` : ''}
                                </div>
                            </div>
                        </td>
                        <td class="text-center font-mono text-slate-300">${s.played}</td>
                        <td class="text-center font-mono text-emerald-400 font-semibold">${s.won}</td>
                        <td class="text-center font-mono text-slate-400">${s.drawn}</td>
                        <td class="text-center font-mono text-rose-400 font-semibold">${s.lost}</td>
                        <td class="text-center font-mono text-slate-300">${s.goalsFor}</td>
                        <td class="text-center font-mono text-slate-400">${s.goalsAgainst}</td>
                        <td class="text-center font-mono font-semibold ${s.goalDifference > 0 ? 'text-emerald-400' : (s.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400')}">
                            ${s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                        </td>
                        <td class="text-center font-mono font-black text-indigo-400 text-base">${s.points}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<p class="text-rose-400 text-center py-6">${err.message}</p>`;
        }
    },

    renderTeamsGrid() {
        const container = document.getElementById('teams-grid-container');
        if (!container) return;

        const teams = this.state.activeTournament.teams;
        document.getElementById('teams-count-badge').textContent = `${teams.length}/${this.state.activeTournament.maxTeams || 8} đội`;

        if (!teams || teams.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400">
                    <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-600"></i>
                    <p class="text-base font-semibold">Chưa có đội nào tham gia</p>
                    <p class="text-xs text-slate-500 mt-1">${this.state.isViewerMode ? 'Ban tổ chức chưa thêm danh sách đội.' : 'Bấm nút "Thêm Đội" để bổ sung danh sách thi đấu.'}</p>
                </div>
            `;
            return;
        }

        const canManage = !this.state.isViewerMode && API.isLoggedIn();

        container.innerHTML = teams.map(tm => `
            <div class="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shadow-inner border border-slate-700/60" style="border-top-color: ${tm.color || '#3b82f6'}; border-top-width: 3px;">
                        ${tm.logo || '🏆'}
                    </div>
                    <div>
                        <div class="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                            ${tm.name}
                            ${tm.shortName ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">${tm.shortName}</span>` : ''}
                        </div>
                        <div class="text-xs text-slate-400 mt-0.5">
                            <span class="text-indigo-400 font-semibold">Hạt giống #${tm.seed}</span>
                            ${tm.contactPerson ? ` • ${tm.contactPerson}` : ''}
                            ${tm.contactPhone ? ` (${tm.contactPhone})` : ''}
                        </div>
                    </div>
                </div>
                ${canManage ? `
                    <button onclick="App.confirmDeleteTeam(${tm.id}, '${tm.name.replace(/'/g, "\\'")}')" class="p-2 text-slate-500 hover:text-rose-400 transition" title="Xóa đội">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    },

    renderInfoPane() {
        const t = this.state.activeTournament;
        if (!t) return;

        document.getElementById('info-description').textContent = t.description || 'Không có mô tả chi tiết.';
        document.getElementById('info-rules').textContent = t.rules || 'Chưa cập nhật quy chế và luật thi đấu cụ thể.';
        document.getElementById('info-prizepool').textContent = t.prizePool || 'Chưa cập nhật cơ cấu giải thưởng.';
    },

    // ==========================================
    // MODALS & ACTIONS
    // ==========================================

    openCreateTournamentModal() {
        // Yêu cầu đăng nhập trước khi tạo giải!
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập tài khoản để tạo giải đấu mới!', 'warning');
            return;
        }

        document.getElementById('create-tournament-form').reset();
        document.getElementById('create-tournament-modal').classList.remove('hidden');
    },

    closeCreateTournamentModal() {
        document.getElementById('create-tournament-modal').classList.add('hidden');
    },

    async handleCreateTournament(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const data = {
            name: formData.get('name'),
            category: formData.get('category'),
            format: parseInt(formData.get('format'), 10),
            maxTeams: parseInt(formData.get('maxTeams'), 10) || 8,
            startDate: formData.get('startDate') ? new Date(formData.get('startDate')).toISOString() : null,
            endDate: formData.get('endDate') ? new Date(formData.get('endDate')).toISOString() : null,
            location: formData.get('location'),
            prizePool: formData.get('prizePool'),
            rules: formData.get('rules'),
            bannerUrl: formData.get('bannerUrl'),
            description: formData.get('description')
        };

        try {
            const created = await API.createTournament(data);
            this.closeCreateTournamentModal();
            this.showToast('Tạo giải đấu mới thành công!', 'success');
            await this.openTournamentDetail(created.id, 'teams', false);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    openEditTournamentModal(id) {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để chỉnh sửa giải!', 'warning');
            return;
        }

        const t = this.state.tournaments.find(x => x.id === id) || this.state.activeTournament;
        if (!t) return;

        document.getElementById('edit-tournament-id').value = t.id;
        document.getElementById('edit-name').value = t.name;
        document.getElementById('edit-category').value = t.category;
        document.getElementById('edit-format').value = t.format;
        document.getElementById('edit-maxTeams').value = t.maxTeams;
        document.getElementById('edit-location').value = t.location || '';
        document.getElementById('edit-prizePool').value = t.prizePool || '';
        document.getElementById('edit-rules').value = t.rules || '';
        document.getElementById('edit-bannerUrl').value = t.bannerUrl || '';
        document.getElementById('edit-description').value = t.description || '';

        document.getElementById('edit-tournament-modal').classList.remove('hidden');
    },

    closeEditTournamentModal() {
        document.getElementById('edit-tournament-modal').classList.add('hidden');
    },

    async handleEditTournament(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const id = parseInt(document.getElementById('edit-tournament-id').value, 10);

        const data = {
            name: formData.get('name'),
            category: formData.get('category'),
            format: parseInt(formData.get('format'), 10),
            maxTeams: parseInt(formData.get('maxTeams'), 10) || 8,
            location: formData.get('location'),
            prizePool: formData.get('prizePool'),
            rules: formData.get('rules'),
            bannerUrl: formData.get('bannerUrl'),
            description: formData.get('description')
        };

        try {
            await API.updateTournament(id, data);
            this.closeEditTournamentModal();
            this.showToast('Cập nhật giải đấu thành công!', 'success');
            if (this.state.view === 'detail' && this.state.activeTournament?.id === id) {
                await this.openTournamentDetail(id, this.state.activeTab, false);
            } else {
                await this.loadTournaments();
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    async confirmDeleteTournament(id, name) {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để xóa giải!', 'warning');
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa giải đấu "${name}" không? Toàn bộ dữ liệu trận đấu và các đội sẽ bị xóa.`)) {
            return;
        }

        try {
            await API.deleteTournament(id);
            this.showToast('Đã xóa giải đấu thành công!', 'success');
            if (this.state.view === 'detail') {
                this.backToTournamentsList();
            } else {
                await this.loadTournaments();
                await this.loadDashboardStats();
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    // Teams Management
    openAddTeamModal() {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để thêm đội!', 'warning');
            return;
        }
        document.getElementById('add-team-modal').classList.remove('hidden');
    },

    closeAddTeamModal() {
        document.getElementById('add-team-modal').classList.add('hidden');
    },

    async handleAddSingleTeam(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const data = {
            name: formData.get('name'),
            shortName: formData.get('shortName'),
            logo: formData.get('logo') || '🏆',
            color: formData.get('color') || '#3B82F6',
            contactPerson: formData.get('contactPerson'),
            contactPhone: formData.get('contactPhone'),
            members: formData.get('members')
        };

        try {
            await API.addTeam(this.state.activeTournament.id, data);
            this.closeAddTeamModal();
            this.showToast('Thêm đội thành công!', 'success');
            form.reset();
            await this.openTournamentDetail(this.state.activeTournament.id, 'teams', false);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    async handleBulkAddTeams() {
        const text = document.getElementById('bulk-teams-textarea').value;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            this.showToast('Vui lòng nhập ít nhất 1 tên đội.', 'warning');
            return;
        }

        try {
            const res = await API.bulkAddTeams(this.state.activeTournament.id, lines);
            this.closeAddTeamModal();
            this.showToast(res.message, 'success');
            document.getElementById('bulk-teams-textarea').value = '';
            await this.openTournamentDetail(this.state.activeTournament.id, 'teams', false);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    async confirmDeleteTeam(teamId, name) {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để xóa đội!', 'warning');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa đội "${name}" khỏi giải đấu?`)) return;

        try {
            await API.deleteTeam(this.state.activeTournament.id, teamId);
            this.showToast('Đã xóa đội thành công!', 'success');
            await this.openTournamentDetail(this.state.activeTournament.id, 'teams', false);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    // Schedule & Bracket Generation
    async handleGenerateSchedule(shuffle = false) {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để tạo nhánh đấu!', 'warning');
            return;
        }

        const t = this.state.activeTournament;
        if (!t) return;

        if (t.teams.length < 2) {
            this.showToast('Cần tối thiểu 2 đội để tạo lịch thi đấu!', 'warning');
            return;
        }

        if (t.matches.length > 0) {
            if (!confirm('Giải đấu đã có lịch thi đấu. Việc tạo lại sẽ làm mới toàn bộ kết quả các trận đã đấu. Bạn có muốn tiếp tục?')) {
                return;
            }
        }

        try {
            document.getElementById('loading-overlay').classList.remove('hidden');
            const res = await API.generateSchedule(t.id, shuffle);
            this.showToast(res.message, 'success');
            await this.openTournamentDetail(t.id, t.format === 1 ? 'matches' : 'bracket', false);
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    // Score Modal & Spectator View Modal
    openScoreModalById(matchId) {
        const match = this.state.activeTournament?.matches.find(m => m.id === matchId);
        if (match) this.openScoreModal(match);
    },

    openScoreModal(match) {
        if (!API.isLoggedIn()) {
            this.openAuthModal('login');
            this.showToast('Bạn cần đăng nhập để cập nhật tỷ số!', 'warning');
            return;
        }

        if (!match.homeTeam || !match.awayTeam) {
            this.showToast('Chưa đủ 2 đội tham gia trận đấu này!', 'warning');
            return;
        }

        this.state.currentEditingMatch = match;

        document.getElementById('score-match-title').textContent = `${match.roundName} - Trận #${match.matchNumber}`;
        document.getElementById('score-home-name').textContent = match.homeTeam.name;
        document.getElementById('score-home-logo').textContent = match.homeTeam.logo || '⚽';
        document.getElementById('score-home-input').value = match.homeScore !== null ? match.homeScore : 0;

        document.getElementById('score-away-name').textContent = match.awayTeam.name;
        document.getElementById('score-away-logo').textContent = match.awayTeam.logo || '⚽';
        document.getElementById('score-away-input').value = match.awayScore !== null ? match.awayScore : 0;

        document.getElementById('score-notes-input').value = match.notes || '';

        document.getElementById('score-modal').classList.remove('hidden');
    },

    closeScoreModal() {
        document.getElementById('score-modal').classList.add('hidden');
        this.state.currentEditingMatch = null;
    },

    // Read-only modal for Spectators
    openMatchViewById(matchId) {
        const match = this.state.activeTournament?.matches.find(m => m.id === matchId);
        if (match) this.openMatchViewModal(match);
    },

    openMatchViewModal(match) {
        const home = match.homeTeam;
        const away = match.awayTeam;

        document.getElementById('view-match-round').textContent = `${match.roundName} • Trận #${match.matchNumber}`;
        document.getElementById('view-match-home-name').textContent = home ? home.name : 'Chờ xác định';
        document.getElementById('view-match-home-logo').textContent = home ? (home.logo || '⚽') : '❓';
        document.getElementById('view-match-home-score').textContent = match.homeScore !== null ? match.homeScore : '-';

        document.getElementById('view-match-away-name').textContent = away ? away.name : 'Chờ xác định';
        document.getElementById('view-match-away-logo').textContent = away ? (away.logo || '⚽') : '❓';
        document.getElementById('view-match-away-score').textContent = match.awayScore !== null ? match.awayScore : '-';

        document.getElementById('view-match-notes').textContent = match.notes || (match.venue ? `Địa điểm: ${match.venue}` : 'Không có ghi chú thêm.');

        document.getElementById('match-view-modal').classList.remove('hidden');
    },

    adjustScore(side, delta) {
        const input = document.getElementById(`score-${side}-input`);
        let val = parseInt(input.value, 10) || 0;
        val = Math.max(0, val + delta);
        input.value = val;
    },

    async handleSaveScore() {
        const match = this.state.currentEditingMatch;
        if (!match) return;

        const homeScore = parseInt(document.getElementById('score-home-input').value, 10) || 0;
        const awayScore = parseInt(document.getElementById('score-away-input').value, 10) || 0;
        const notes = document.getElementById('score-notes-input').value;

        try {
            await API.updateScore(match.id, homeScore, awayScore, notes);
            this.closeScoreModal();
            this.showToast('Cập nhật kết quả trận đấu thành công!', 'success');

            // Pháo hoa nếu là chung kết
            if (match.roundName?.toLowerCase().includes('chung kết') && !match.roundName?.toLowerCase().includes('hạng ba')) {
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 }
                    });
                }
            }

            await this.openTournamentDetail(this.state.activeTournament.id, this.state.activeTab, false);
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    // CSV Export
    exportMatchesToCSV() {
        const t = this.state.activeTournament;
        if (!t || !t.matches || t.matches.length === 0) {
            this.showToast('Chưa có danh sách trận để xuất.', 'warning');
            return;
        }

        let csvContent = "\uFEFF"; // BOM for UTF-8 in Excel
        csvContent += "Vòng,Trận,Đội Nhà,Tỷ Số Nhà,Tỷ Số Khách,Đội Khách,Thời Gian,Địa Điểm,Đội Thắng,Ghi Chú\n";

        t.matches.forEach(m => {
            const home = m.homeTeam ? m.homeTeam.name : 'Chờ xác định';
            const away = m.awayTeam ? m.awayTeam.name : 'Chờ xác định';
            const winner = m.winnerTeam ? m.winnerTeam.name : '';
            const hScore = m.homeScore !== null ? m.homeScore : '';
            const aScore = m.awayScore !== null ? m.awayScore : '';
            const time = m.scheduledTime ? new Date(m.scheduledTime).toLocaleString('vi-VN') : '';
            const venue = m.venue || '';
            const notes = m.notes || '';

            csvContent += `"${m.roundName}","Trận ${m.matchNumber}","${home}","${hScore}","${aScore}","${away}","${time}","${venue}","${winner}","${notes}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `LichThiDau_${t.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('Đã xuất file CSV thành công!', 'success');
    },

    // Toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const colors = {
            success: 'bg-emerald-600 border-emerald-500 text-white',
            error: 'bg-rose-600 border-rose-500 text-white',
            warning: 'bg-amber-600 border-amber-500 text-white',
            info: 'bg-indigo-600 border-indigo-500 text-white'
        };

        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        const toast = document.createElement('div');
        toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${colors[type] || colors.info} transform transition-all duration-300 translate-y-2 opacity-0 text-sm font-medium`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info} text-lg"></i>
            <span class="flex-1">${message}</span>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

// Initialize App once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
