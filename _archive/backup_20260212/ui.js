import { getStats, sanitizePhoneNumber } from './utils.js';

export function showView(id) {
    ['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    // Handle clean layout for internal pages (result/error)
    if (id === 'result-view' || id === 'error-view' || id === 'loading-view') {
        document.body.classList.add('internal-clean');
    } else {
        document.body.classList.remove('internal-clean');
    }

    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    const adminIcon = document.getElementById('admin-icon');
    const adminTrigger = document.getElementById('admin-trigger');

    if (id === 'admin-view') {
        if (adminIcon) adminIcon.setAttribute('data-lucide', 'x');
        if (adminTrigger) adminTrigger.classList.add('bg-slate-900', 'border-slate-900');
    } else {
        if (adminIcon) adminIcon.setAttribute('data-lucide', 'settings');
        if (adminTrigger) adminTrigger.classList.remove('bg-slate-900', 'border-slate-900');
    }
    if (window.lucide) window.lucide.createIcons();
}

export function showConnectionError(msg) {
    const errorView = document.getElementById('error-view');
    if (!errorView) return;
    const title = errorView.querySelector('h2');
    const desc = errorView.querySelector('p');
    if (title) title.textContent = '연결 오류';
    if (desc) desc.textContent = msg;
    showView('error-view');
}

export function renderResult(user, inputName) {
    const nameEl = document.getElementById('res-name');
    const deptEl = document.getElementById('res-dept');
    const activityEl = document.getElementById('res-activity-detail');
    const timeEl = document.getElementById('res-time');
    const locEl = document.getElementById('res-location');
    const guideEl = document.getElementById('res-guide');

    if (nameEl) nameEl.textContent = user.name || user.이름 || inputName;
    if (deptEl) deptEl.textContent = user.department || user.부서 || '';
    if (activityEl) activityEl.textContent = user.activity_name || user.액티비티 || user.bus || '-';
    if (timeEl) timeEl.textContent = user.start_time || user.출발시간 || '-';
    if (locEl) locEl.textContent = user.meeting_point || user.집합장소 || '-';
    if (guideEl) guideEl.textContent = user.guide_info || user['가이드 정보'] || '-';

    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) {
        const schedules = [user.schedule_1 || user['일정 1'], user.schedule_2 || user['일정 2'], user.schedule_3 || user['일정 3']].filter(s => s && s.trim());
        if (schedules.length > 0) {
            timelineContainer.innerHTML = `
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th class="time-col">시간</th>
                            <th>내용</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(item => {
                // Extract time from beginning of string if possible
                const match = item.match(/^(\d{1,2}:\d{2})\s*(.*)$/) || item.match(/^([\d.,가-힣]+)\s*(.*)$/);
                const time = match ? match[1] : '-';
                const content = match ? match[2] : item;
                return `<tr><td class="time-col">${time}</td><td>${content}</td></tr>`;
            }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            timelineContainer.innerHTML = '<p class="text-slate-400 text-xs text-center py-8">등록된 일정이 없습니다.</p>';
        }
    }

    const supplies = user.supplies || user.준비물;
    const notice = user.notice || user.주의사항;
    const noticeBox = document.getElementById('notice-box');
    if (noticeBox) {
        if (supplies || notice) {
            noticeBox.classList.remove('hidden');
            noticeBox.className = "remarks-footer fade-in";
            noticeBox.innerHTML = `
                <div class="remarks-label">
                    <i data-lucide="info" class="w-3 h-3"></i> Remarks / 주의사항
                </div>
                <div class="space-y-3">
                    ${supplies ? `<div class="flex gap-2 items-start"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-none"></span><p class="text-xs font-bold text-slate-700 leading-relaxed">${supplies}</p></div>` : ''}
                    ${notice ? `<div class="flex gap-2 items-start"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-none"></span><p class="text-xs font-bold text-slate-700 leading-relaxed">${notice}</p></div>` : ''}
                </div>
            `;
        } else {
            noticeBox.classList.add('hidden');
        }
    }
    if (window.lucide) window.lucide.createIcons();
}

export function updateAdminDashboard(participants, checkins, sortMode, searchVal) {
    const totalEl = document.getElementById('admin-total-count');
    const checkedEl = document.getElementById('admin-checked-count');
    if (totalEl) totalEl.textContent = participants.length;

    // Calculate Valid Unique Check-ins (Matches List View logic)
    const checkedPhones = new Set();
    checkins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedPhones.add(sPhone);
    });

    let validCheckedCount = 0;
    participants.forEach(p => {
        const sPhone = sanitizePhoneNumber(p.phone || p.휴대전화 || '');
        if (checkedPhones.has(sPhone)) validCheckedCount++;
    });

    if (checkedEl) checkedEl.textContent = validCheckedCount;

    const logEl = document.getElementById('checkin-log');
    if (logEl) {
        if (checkins.length === 0) {
            logEl.innerHTML = '<p class="text-slate-400 text-center py-10 text-[10px] font-black uppercase tracking-widest">No Activity Logged</p>';
        } else {
            logEl.innerHTML = checkins.map(c => {
                const time = new Date(c.checkedInAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                return `<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2.5 transition-soft">
                            <div class="flex items-center gap-3">
                                <span class="font-black text-slate-900 text-[11px]">${c.name}</span>
                                <span class="text-[8px] text-slate-300 font-bold uppercase tracking-widest">${c.department || '-'}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-[#9E2AB5] font-black text-[9px] uppercase tracking-tight">${(c.activity || '').split(':')[0]}</span>
                                <span class="text-[8px] font-bold text-slate-300">${time}</span>
                            </div>
                        </div>`;
            }).join('');
        }
    }
    renderAttendanceList(participants, checkins, sortMode, searchVal);
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer && !statsContainer.classList.contains('hidden')) {
        renderStats(participants, checkins);
    }
    if (window.lucide) window.lucide.createIcons();
}

export function renderStats(participants, checkins) {
    const stats = getStats(participants, checkins);
    const container = document.getElementById('stats-container');
    if (!container) return;
    container.innerHTML = Object.entries(stats).map(([key, val]) => {
        const percent = Math.round((val.checked / val.total) * 100) || 0;
        return `
            <div class="bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[9px] font-black text-slate-800 uppercase tracking-tight">${key}</span>
                    <span class="text-[8px] font-bold text-[#00A97A]">${percent}%</span>
                </div>
                <div class="flex justify-between items-end">
                    <span class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Progress</span>
                    <span class="text-[10px] font-black text-slate-900 leading-none">${val.checked}<span class="text-slate-300">/${val.total}</span></span>
                </div>
                <div class="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-[#00A97A] rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>`;
    }).join('');
}

export function renderAttendanceList(participants, checkins, sortMode, searchVal) {
    const listEl = document.getElementById('attendance-list');
    if (!listEl) return;

    if (participants.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 text-center py-8">Upload CSV first</p>';
        return;
    }

    const checkedMap = new Map();
    checkins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, c);
    });

    const displayData = participants
        .filter(p => {
            if (!searchVal) return true;
            const name = (p.name || p.이름 || '').toLowerCase();
            const phone = (p.phone || p.휴대전화 || '');
            return name.includes(searchVal) || phone.includes(searchVal);
        })
        .map(p => {
            const sPhone = sanitizePhoneNumber(p.phone || p.휴대전화 || '');
            return { ...p, sPhone, isChecked: checkedMap.has(sPhone) };
        });

    displayData.sort((a, b) => {
        if (sortMode === 'status') {
            // Sort by isChecked (true first), then by name
            if (a.isChecked !== b.isChecked) {
                return a.isChecked ? -1 : 1;
            }
            return (a.name || a.이름 || '').localeCompare(b.name || b.이름 || '');
        } else if (sortMode === 'course') {
            const courseA = (a.activity_name || a.액티비티 || a.bus || '').toLowerCase();
            const courseB = (b.activity_name || b.액티비티 || b.bus || '').toLowerCase();
            if (courseA === courseB) {
                return (a.name || a.이름 || '').localeCompare(b.name || b.이름 || '');
            }
            return courseA.localeCompare(courseB);
        }
        // Default sort by name
        return (a.name || a.이름 || '').localeCompare(b.name || b.이름 || '');
    });

    if (displayData.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 text-center py-8 text-[10px]">No results found</p>';
        return;
    }

    listEl.innerHTML = displayData.map(p => {
        return `<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2 group hover:border-[#00A97A]/30 transition-soft">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full ${p.isChecked ? 'bg-[#00A97A]' : 'bg-slate-200'}"></div>
                        <span class="font-black text-slate-900 text-[11px]">${p.name || p.이름}</span>
                        <span class="text-[8px] text-slate-300 font-bold uppercase tracking-widest">${p.department || '-'}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[#9E2AB5] font-black text-[8px] uppercase tracking-widest bg-[#9E2AB5]/5 px-1.5 py-0.5 rounded-md">${(p.activity_name || p.액티비티 || p.bus || '').split(':')[0]}</span>
                        <div class="w-12 text-center">
                            ${p.isChecked
                ? `<span class="text-[8px] font-black text-[#00A97A] uppercase tracking-widest">Done</span>`
                : `<span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Wait</span>`
            }
                        </div>
                    </div>
                </div>`;
    }).join('');
}
