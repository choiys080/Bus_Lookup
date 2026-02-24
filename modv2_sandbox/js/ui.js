import { getStats, sanitizePhoneNumber, normalizeName } from './utils.js';

export function showView(id) {
    ['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view', 'setup-view', 'help-view'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    // Design Requirement: "Result/Ticket View" should be clean white background without the image
    const app = document.getElementById('app');
    const header = app ? app.querySelector('div.px-8.py-7') || app.children[0] : null;
    const contentArea = document.getElementById('content-area');

    if (id === 'result-view' || id === 'admin-view') {
        document.body.classList.add('internal-clean');

        if (header) {
            header.classList.remove('py-7', 'pt-6', 'pb-2', 'sm:py-7');
            header.classList.add('pt-4', 'pb-0');
        }
        if (contentArea) {
            contentArea.classList.remove('p-4', 'p-8', 'sm:p-8', 'pt-2', 'pt-1');
            contentArea.classList.add('px-8', 'pb-8', 'pt-0');
        }
    } else {
        document.body.classList.remove('internal-clean');
        if (app) {
            app.style.removeProperty('background');
        }

        if (header) {
            header.classList.add('py-7');
            header.classList.remove('py-2');
        }
        if (contentArea) {
            contentArea.classList.add('p-4', 'sm:p-8');
            contentArea.classList.remove('p-8', 'px-8', 'pb-8', 'pt-2');
        }
    }

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

// Helper to extract course details not present in CSV
function getActivityDetails(activityName) {
    const details = {
        summary: '-',
        duration: '-'
    };

    if (!activityName) return details;

    // Extract content within parentheses for summary if possible
    const match = activityName.match(/\(([^)]+)\)/);
    if (match) {
        details.summary = match[1];
    } else if (activityName.includes(':')) {
        details.summary = activityName.split(':')[1].trim();
    }

    // Assign durations based on common keywords
    if (activityName.includes('한라산')) {
        details.duration = '약 6시간';
    } else if (activityName.includes('올레시장') || activityName.includes('본태박물관')) {
        details.duration = '약 3시간';
    } else if (activityName.includes('갤러리') || activityName.includes('숲길')) {
        details.duration = '약 3.5시간';
    } else if (activityName.includes('요트')) {
        details.duration = '약 2시간';
    } else {
        details.duration = '평균 3~4시간';
    }

    return details;
}

export function renderResult(user, inputName, activityTitle, timeHeader, guideHeader, meetingHeader, summaryHeader, durationHeader, timelineTimeHeader, suppliesHeader, noticeHeader) {
    const nameEl = document.getElementById('res-name');
    const deptEl = document.getElementById('res-dept');
    const activityEl = document.getElementById('res-activity-detail');
    const summaryEl = document.getElementById('res-course-summary');
    const timeEl = document.getElementById('res-time');
    const durationEl = document.getElementById('res-duration');
    const guideEl = document.getElementById('res-guide');
    const placeEl = document.getElementById('res-place');
    const titleEl = document.getElementById('res-activity-title');
    const timeHeaderEl = document.getElementById('res-time-header');
    const guideHeaderEl = document.getElementById('res-guide-header');
    const placeHeaderEl = document.getElementById('res-place-header');
    const summaryHeaderEl = document.getElementById('res-summary-header');
    const durationHeaderEl = document.getElementById('res-duration-header');
    const timelineTimeHeaderEl = document.getElementById('res-timeline-time-header');
    const suppliesHeaderEl = document.getElementById('res-supplies-header');
    const noticeHeaderEl = document.getElementById('res-notice-header');

    const name = user.name || user.이름 || inputName || 'User';
    if (nameEl) nameEl.textContent = name;
    if (deptEl) deptEl.textContent = user.department || user.부서 || '';
    if (titleEl && activityTitle) titleEl.textContent = activityTitle;
    if (timeHeaderEl && timeHeader) timeHeaderEl.textContent = timeHeader;
    if (guideHeaderEl && guideHeader) guideHeaderEl.textContent = guideHeader.trim();
    if (placeHeaderEl && meetingHeader) placeHeaderEl.textContent = meetingHeader.trim();
    if (summaryHeaderEl && summaryHeader) summaryHeaderEl.textContent = summaryHeader.trim();
    if (durationHeaderEl && durationHeader) durationHeaderEl.textContent = durationHeader.trim();
    if (timelineTimeHeaderEl && timelineTimeHeader) timelineTimeHeaderEl.textContent = timelineTimeHeader.trim();
    if (suppliesHeaderEl && suppliesHeader) suppliesHeaderEl.textContent = suppliesHeader.trim();
    if (noticeHeaderEl && noticeHeader) noticeHeaderEl.textContent = noticeHeader.trim();

    // Robust access for activity name (CSV has "액티비티 ")
    const activityName = user.activity_name || user['액티비티 '] || user.액티비티 || user.bus || '';
    const courseDetails = getActivityDetails(activityName);

    if (activityEl) activityEl.textContent = activityName || '-';

    // Summary and Duration derived or from user object if it exists
    const finalSummary = user.course_summary || user.요약 || user['요약 '] || courseDetails.summary;
    if (summaryEl) {
        summaryEl.textContent = (finalSummary && finalSummary !== '-') ? finalSummary : courseDetails.summary;
    }

    // Time access (CSV has "출발시간")
    if (timeEl) timeEl.textContent = user.start_time || user.출발시간 || user['출발시간 '] || '-';

    if (placeEl) placeEl.textContent = user.meeting_point || user.집합장소 || '-';

    // Duration access
    const finalDuration = user.duration || user.소요시간 || user['소요시간 '] || courseDetails.duration;
    if (durationEl) {
        durationEl.textContent = (finalDuration && finalDuration !== '-') ? finalDuration : courseDetails.duration;
    }

    // Guide Info (CSV has "가이드 정보")
    if (guideEl) guideEl.textContent = user.guide_info || user['가이드 정보'] || user['가이드 정보 '] || '-';

    // Timeline Row Generation
    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) {
        const scheduleData = [
            { time: user.time_1, content: user.schedule_1 },
            { time: user.time_2, content: user.schedule_2 },
            { time: user.time_3, content: user.schedule_3 }
        ].filter(item => item.content && item.content.trim());

        if (scheduleData.length > 0) {
            timelineContainer.innerHTML = scheduleData.map(item => {
                let time = item.time || '-';
                let content = item.content;

                // Fallback to regex if time is missing and content contains a time pattern
                if (time === '-' || !time) {
                    const timeMatch = content.match(/^(\d{2}:\d{2}\s*(?:[~-]\s*\d{2}:\d{2})?)\s*(.*)/);
                    if (timeMatch) {
                        time = timeMatch[1].trim();
                        content = timeMatch[2].trim();
                    }
                }

                return `
                    <tr class="hover:bg-[#00A97A]/5 transition-soft">
                        <td class="px-4 py-3 text-[13px] font-black text-slate-400 tabular-nums whitespace-nowrap w-[105px]">${time}</td>
                        <td class="px-4 py-3 text-[13px] font-semibold text-slate-800 leading-relaxed">${content}</td>
                    </tr>
                `;
            }).join('');
        } else {
            timelineContainer.innerHTML = '<tr><td colspan="2" class="px-4 py-8 text-center text-slate-300 text-[12px] font-bold uppercase tracking-widest">No schedule available</td></tr>';
        }
    }


    const supplies = user.supplies || user.준비물;
    const notice = user.notice || user.주의사항;
    const noticeBox = document.getElementById('notice-box');
    if (noticeBox) {
        if (supplies || notice) {
            noticeBox.classList.remove('hidden');
            const sEl = noticeBox.querySelector('#notice-supplies');
            const wEl = noticeBox.querySelector('#notice-warning');
            const sCont = document.getElementById('notice-supplies-container');
            const wCont = document.getElementById('notice-warning-container');

            if (sEl) {
                const cleanSupplies = (supplies || '').replace(/^Remark\s*[:]\s*/i, '').trim();
                sEl.querySelector('span').textContent = cleanSupplies;
                if (sCont) sCont.style.display = cleanSupplies ? 'block' : 'none';
            }
            if (wEl) {
                const cleanNotice = (notice || '').trim();
                wEl.querySelector('span').textContent = cleanNotice;
                if (wCont) wCont.style.display = cleanNotice ? 'block' : 'none';
            }
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
    const checkedNames = new Set();
    checkins.forEach(c => {
        if (c.name) {
            const norm = normalizeName(c.name);
            checkedNames.add(norm);
        }
    });

    let validCheckedCount = 0;
    participants.forEach(p => {
        const pName = normalizeName(p.name || p.이름 || '');
        if (pName && checkedNames.has(pName)) {
            validCheckedCount++;
        }
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

    const checkedNames = new Set();
    checkins.forEach(c => {
        if (c.name) {
            const norm = normalizeName(c.name);
            checkedNames.add(norm);
        }
    });

    const displayData = participants
        .filter(p => {
            if (!searchVal) return true;
            const name = (p.name || p.이름 || '').toLowerCase();
            const phone = (p.phone || p.휴대전화 || '');
            return name.includes(searchVal) || phone.includes(searchVal);
        })
        .map(p => {
            const pName = normalizeName(p.name || p.이름 || '');
            const isChecked = pName && checkedNames.has(pName);
            return { ...p, isChecked };
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
        return `<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2 group hover:border-[#00A97A]/40 hover:shadow-sm transition-soft tap-effect">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full ${p.isChecked ? 'bg-[#00A97A]' : 'bg-slate-200'}"></div>
                        <span class="font-black text-slate-900 text-[11px]">${p.name || p.이름}</span>
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">${p.department || '-'}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[#9E2AB5] font-black text-[8px] uppercase tracking-widest bg-[#9E2AB5]/5 px-1.5 py-0.5 rounded-md">${(p.activity_name || p.액티비티 || p.bus || '').split(':')[0]}</span>
                        <div class="w-12 text-center text-[8px] font-black uppercase tracking-widest">
                            ${p.isChecked
                ? `<span class="text-[#00A97A]">Done</span>`
                : `<span class="text-slate-300">Wait</span>`
            }
                        </div>
                    </div>
                </div>`;
    }).join('');
}

export function initParallax() {
    const bg = document.getElementById('bg-parallax');
    if (!bg) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                const progress = Math.min(1, scrolled / maxScroll);

                // Perfect Mapping Parallax: 0% at top, 100% at bottom
                // Ensures bottom logos are visible at the end of scroll
                bg.style.backgroundPositionY = `${progress * 100}%`;

                // Clear any leftover transforms
                bg.style.transform = 'none';
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}
