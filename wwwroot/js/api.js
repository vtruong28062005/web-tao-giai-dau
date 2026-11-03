// API Client for Tournament App with Authentication Support
const API = {
    baseUrl: '',

    // Token & Auth storage
    getToken() {
        return localStorage.getItem('tournapro_token');
    },

    setAuth(authData) {
        if (authData && authData.token) {
            localStorage.setItem('tournapro_token', authData.token);
            localStorage.setItem('tournapro_user', JSON.stringify({
                id: authData.id,
                username: authData.username,
                fullName: authData.fullName,
                role: authData.role
            }));
        }
    },

    clearAuth() {
        localStorage.removeItem('tournapro_token');
        localStorage.removeItem('tournapro_user');
    },

    getCurrentUser() {
        try {
            const data = localStorage.getItem('tournapro_user');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    async request(url, options = {}) {
        try {
            const defaultHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const token = this.getToken();
            if (token) {
                defaultHeaders['Authorization'] = `Bearer ${token}`;
            }

            const config = {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            };

            if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
                config.body = JSON.stringify(config.body);
            }

            const res = await fetch(this.baseUrl + url, config);
            if (!res.ok) {
                let errorMsg = `Lỗi (${res.status})`;
                try {
                    const errData = await res.json();
                    errorMsg = errData.message || errorMsg;
                } catch (e) {
                    // Ignore text error
                }

                if (res.status === 401 && !url.includes('/api/auth/login')) {
                    // Phiên đăng nhập hết hạn hoặc chưa đăng nhập
                    this.clearAuth();
                    if (typeof App !== 'undefined' && App.updateAuthUI) {
                        App.updateAuthUI();
                    }
                }

                throw new Error(errorMsg);
            }

            if (res.status === 204) return null;
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // Authentication
    async login(username, password) {
        const res = await this.request('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });
        this.setAuth(res);
        return res;
    },

    async register(username, password, fullName, email, role = 'Organizer') {
        const res = await this.request('/api/auth/register', {
            method: 'POST',
            body: { username, password, fullName, email, role }
        });
        this.setAuth(res);
        return res;
    },

    async logout() {
        this.clearAuth();
    },

    async checkMe() {
        if (!this.isLoggedIn()) return null;
        try {
            return await this.request('/api/auth/me');
        } catch (e) {
            this.clearAuth();
            return null;
        }
    },

    // Tournaments
    async getTournaments(params = {}) {
        const query = new URLSearchParams();
        if (params.search) query.append('search', params.search);
        if (params.category && params.category !== 'Tất cả') query.append('category', params.category);
        if (params.status !== undefined && params.status !== '') query.append('status', params.status);

        const qs = query.toString() ? `?${query.toString()}` : '';
        return await this.request(`/api/tournaments${qs}`);
    },

    async getTournament(id) {
        return await this.request(`/api/tournaments/${id}`);
    },

    async createTournament(data) {
        return await this.request('/api/tournaments', {
            method: 'POST',
            body: data
        });
    },

    async updateTournament(id, data) {
        return await this.request(`/api/tournaments/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteTournament(id) {
        return await this.request(`/api/tournaments/${id}`, {
            method: 'DELETE'
        });
    },

    // Teams
    async addTeam(tournamentId, teamData) {
        return await this.request(`/api/tournaments/${tournamentId}/teams`, {
            method: 'POST',
            body: teamData
        });
    },

    async bulkAddTeams(tournamentId, teamNames) {
        return await this.request(`/api/tournaments/${tournamentId}/teams/bulk`, {
            method: 'POST',
            body: { teamNames }
        });
    },

    async deleteTeam(tournamentId, teamId) {
        return await this.request(`/api/tournaments/${tournamentId}/teams/${teamId}`, {
            method: 'DELETE'
        });
    },

    // Matches & Bracket
    async generateSchedule(tournamentId, shuffle = false) {
        return await this.request(`/api/tournaments/${tournamentId}/generate-schedule`, {
            method: 'POST',
            body: { shuffle }
        });
    },

    async updateScore(matchId, homeScore, awayScore, notes = null) {
        return await this.request(`/api/matches/${matchId}/score`, {
            method: 'PUT',
            body: { homeScore, awayScore, notes }
        });
    },

    async updateMatchDetails(matchId, details) {
        return await this.request(`/api/matches/${matchId}/details`, {
            method: 'PUT',
            body: details
        });
    },

    // Standings
    async getStandings(tournamentId, groupName = null) {
        const qs = groupName ? `?groupName=${encodeURIComponent(groupName)}` : '';
        return await this.request(`/api/tournaments/${tournamentId}/standings${qs}`);
    },

    // Stats
    async getDashboardStats() {
        return await this.request('/api/dashboard/stats');
    }
};
