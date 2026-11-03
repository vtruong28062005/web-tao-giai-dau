// Bracket and Match rendering helper
const BracketRenderer = {
    renderBracket(matches, teams, containerId, onMatchClick, canEdit = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!matches || matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-slate-400">
                    <i class="fa-solid fa-sitemap text-5xl mb-4 text-slate-600"></i>
                    <p class="text-lg font-medium">Chưa có sơ đồ bảng đấu</p>
                    <p class="text-sm mt-1 text-slate-500">${canEdit ? 'Hãy thêm ít nhất 2 đội và bấm "Tạo sơ đồ thi đấu" để bắt đầu.' : 'Ban tổ chức chưa công bố lịch thi đấu.'}</p>
                </div>
            `;
            return;
        }

        // Tách riêng trận tranh hạng ba (nếu có)
        const regularMatches = matches.filter(m => !m.roundName?.toLowerCase().includes('hạng ba'));
        const thirdPlaceMatch = matches.find(m => m.roundName?.toLowerCase().includes('hạng ba'));

        // Nhóm các trận đấu theo Round
        const roundsMap = {};
        regularMatches.forEach(m => {
            if (!roundsMap[m.round]) roundsMap[m.round] = [];
            roundsMap[m.round].push(m);
        });

        const roundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
        const finalRoundNum = roundNumbers[roundNumbers.length - 1];
        const finalMatch = roundsMap[finalRoundNum]?.[0];
        const champion = finalMatch && finalMatch.status === 2 && finalMatch.winnerTeam;

        let html = '<div class="bracket-wrapper">';

        roundNumbers.forEach((roundNum, index) => {
            const roundMatches = roundsMap[roundNum];
            const roundTitle = roundMatches[0]?.roundName || `Vòng ${roundNum}`;
            const isFinalRound = (roundNum === finalRoundNum);

            html += `
                <div class="bracket-round">
                    <div class="mb-4 pb-2 border-b border-slate-700 flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider ${isFinalRound ? 'text-amber-400' : 'text-indigo-400'}">
                            ${isFinalRound ? '<i class="fa-solid fa-trophy mr-1"></i> ' : ''}${roundTitle}
                        </span>
                        <span class="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">${roundMatches.length} trận</span>
                    </div>
                    <div class="flex flex-col justify-around flex-1 space-y-6">
            `;

            roundMatches.forEach(match => {
                html += this.renderMatchCard(match, onMatchClick, canEdit);
            });

            html += `
                    </div>
                </div>
            `;
        });

        // Nếu có Nhà Vô Địch, thêm cột bục vinh quang Champion!
        if (champion) {
            html += `
                <div class="bracket-round flex flex-col justify-center items-center">
                    <div class="mb-4 pb-2 border-b border-slate-700 text-center w-full">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-400">
                            👑 NHÀ VÔ ĐỊCH
                        </span>
                    </div>
                    <div class="glass-panel p-6 rounded-2xl text-center border-amber-500/40 glow-primary bg-gradient-to-b from-amber-500/10 to-transparent animate-pulse-slow">
                        <div class="text-5xl mb-3">🏆</div>
                        <div class="text-2xl font-black text-amber-300 mb-1">${champion.name}</div>
                        <div class="text-xs text-amber-400/80 font-semibold uppercase tracking-wider mb-3">Quán quân giải đấu</div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                            <i class="fa-solid fa-crown"></i> Champion 2026
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';

        // Tranh hạng ba (nếu có)
        if (thirdPlaceMatch) {
            html += `
                <div class="mt-8 pt-6 border-t border-slate-800">
                    <div class="flex items-center gap-2 mb-3">
                        <i class="fa-solid fa-medal text-amber-600"></i>
                        <h4 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Trận Đấu Tranh Hạng Ba</h4>
                    </div>
                    <div class="max-w-md">
                        ${this.renderMatchCard(thirdPlaceMatch, onMatchClick, canEdit)}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.attachMatchClickEvents(containerId, matches, onMatchClick, canEdit);
    },

    renderMatchCard(match, onMatchClick, canEdit = true) {
        const isCompleted = match.status === 2;
        const isLive = match.status === 1;

        const home = match.homeTeam;
        const away = match.awayTeam;

        const homeWon = isCompleted && match.winnerTeamId === match.homeTeamId && home != null;
        const awayWon = isCompleted && match.winnerTeamId === match.awayTeamId && away != null;

        const homeName = home ? home.name : '<span class="text-slate-500 italic">Chờ xác định...</span>';
        const awayName = away ? away.name : '<span class="text-slate-500 italic">Chờ xác định...</span>';

        const homeLogo = home ? (home.logo || '⚽') : '❓';
        const awayLogo = away ? (away.logo || '⚽') : '❓';

        const homeScore = match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : '-';
        const awayScore = match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : '-';

        let statusBadge = '';
        if (isCompleted) {
            statusBadge = '<span class="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Kết thúc</span>';
        } else if (isLive) {
            statusBadge = '<span class="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse"><i class="fa-solid fa-circle text-[8px] mr-1 text-rose-500"></i>LIVE</span>';
        } else {
            statusBadge = '<span class="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Sắp diễn ra</span>';
        }

        const isClickable = home && away;
        const footerText = canEdit ? 'Bấm để nhập tỷ số' : 'Bấm để xem chi tiết';
        const footerIcon = canEdit ? 'fa-pen' : 'fa-eye';

        return `
            <div class="bracket-match glass-panel rounded-xl overflow-hidden border border-slate-700/80 transition-all duration-200 hover:border-indigo-500/60 hover:shadow-lg ${isClickable ? 'cursor-pointer' : 'cursor-default'}"
                 data-match-id="${match.id}">
                <!-- Match Top Bar -->
                <div class="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span class="font-mono text-[11px] font-semibold text-indigo-300">Trận #${match.matchNumber}</span>
                    <div class="flex items-center gap-1.5">
                        ${statusBadge}
                    </div>
                </div>

                <!-- Match Teams & Scores -->
                <div class="p-2.5 space-y-1.5">
                    <!-- Home Team -->
                    <div class="flex items-center justify-between p-1.5 rounded-lg transition-colors ${homeWon ? 'bg-indigo-600/25 border border-indigo-500/40 font-bold text-white' : 'hover:bg-slate-800/50'}">
                        <div class="flex items-center gap-2 overflow-hidden mr-2">
                            <span class="text-base select-none">${homeLogo}</span>
                            <span class="truncate text-sm ${homeWon ? 'text-indigo-200 font-bold' : (home ? 'text-slate-200' : 'text-slate-500')}">
                                ${homeName}
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            ${homeWon ? '<i class="fa-solid fa-check text-xs text-indigo-400"></i>' : ''}
                            <span class="font-mono text-sm px-2 py-0.5 rounded ${homeWon ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 font-semibold'} min-w-[28px] text-center">
                                ${homeScore}
                            </span>
                        </div>
                    </div>

                    <!-- Away Team -->
                    <div class="flex items-center justify-between p-1.5 rounded-lg transition-colors ${awayWon ? 'bg-indigo-600/25 border border-indigo-500/40 font-bold text-white' : 'hover:bg-slate-800/50'}">
                        <div class="flex items-center gap-2 overflow-hidden mr-2">
                            <span class="text-base select-none">${awayLogo}</span>
                            <span class="truncate text-sm ${awayWon ? 'text-indigo-200 font-bold' : (away ? 'text-slate-200' : 'text-slate-500')}">
                                ${awayName}
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            ${awayWon ? '<i class="fa-solid fa-check text-xs text-indigo-400"></i>' : ''}
                            <span class="font-mono text-sm px-2 py-0.5 rounded ${awayWon ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 font-semibold'} min-w-[28px] text-center">
                                ${awayScore}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Match Footer (Notes / Hint) -->
                <div class="px-3 py-1 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span class="truncate max-w-[190px] text-slate-400">
                        ${match.notes ? `<i class="fa-solid fa-tag text-[9px] mr-1 text-slate-500"></i>${match.notes}` : (match.venue ? `<i class="fa-solid fa-location-dot text-[9px] mr-1 text-slate-500"></i>${match.venue}` : footerText)}
                    </span>
                    <i class="fa-solid ${footerIcon} text-[10px] text-slate-500"></i>
                </div>
            </div>
        `;
    },

    attachMatchClickEvents(containerId, matches, onMatchClick, canEdit = true) {
        const container = document.getElementById(containerId);
        if (!container || !onMatchClick) return;

        const cards = container.querySelectorAll('.bracket-match[data-match-id]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const matchId = parseInt(card.getAttribute('data-match-id'), 10);
                const match = matches.find(m => m.id === matchId);
                if (match) {
                    onMatchClick(match, canEdit);
                }
            });
        });
    }
};
