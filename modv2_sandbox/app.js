import { auth, db, appId, isConfigured } from './js/config.js';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { fetchParticipants, listenToCheckins, batchUploadParticipants, batchDeleteAll, checkParticipantStatus, fetchMetadata, updateMetadata } from './js/services.js';
import { sanitizePhoneNumber, parseCSVLine, getSafeHeader, parseCSV } from './js/utils.js';
import * as ui from './js/ui.js';
import { initSetup } from './js/setup.js';

// EXPOSE TO GLOBALS for index.html onclicks
window.ui = ui;
window.initSetup = initSetup;
window.isConfigured = isConfigured;
window.showView = ui.showView;
window.openDevModal = () => {
    const modal = document.getElementById('dev-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // Re-initialize icons just in case
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};
window.closeDevModal = () => {
    const modal = document.getElementById('dev-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// AUTH & ADMIN (Forward declarations for onclicks)
window.submitPassword = () => { console.error("Admin not ready"); };
window.cancelPassword = () => { };
window.toggleAdmin = () => { };
window.switchAdminTab = () => { };
window.toggleStats = () => { };
window.filterAdminList = () => { };
window.sortAttendance = () => { };
window.clearCheckins = () => { };
window.exportFullReport = () => { };

// STATE
let PARTICIPANTS = [];
let METADATA = {};
let currentCheckins = [];
let currentSortMode = 'status';
let currentUser = null;
let checkinsUnsubscribe = null;

// IN-APP LOGGING (Hidden by default, used for Production Debugging)
const debugLog = (msg) => {
    console.log(msg);
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        line.style.padding = '4px 0';
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        consoleEl.prepend(line);
    }
};
window.debugLog = debugLog;

// FETCH LOCAL CSV HEADER (D-1)
const fetchLocalCSVHeader = async () => {
    try {
        const response = await fetch('./participants_data.csv');
        if (!response.ok) return null;
        const text = await response.text();
        const allRows = parseCSV(text);
        if (allRows.length > 0) {
            const headers = allRows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
            // Column D is index 3
            if (headers[3]) {
                METADATA.activity_header = headers[3];
                const resEl = document.getElementById('res-activity-title');
                if (resEl) resEl.textContent = headers[3];
            }
            if (headers[4]) {
                METADATA.time_header = headers[4];
                const timeHeaderEl = document.getElementById('res-time-header');
                if (timeHeaderEl) timeHeaderEl.textContent = headers[4];
            }
            if (headers[5]) {
                METADATA.meeting_header = headers[5];
                const placeHeaderEl = document.getElementById('res-place-header');
                if (placeHeaderEl) placeHeaderEl.textContent = headers[5];
            }
            if (headers[6]) {
                METADATA.guide_header = headers[6];
                const guideHeaderEl = document.getElementById('res-guide-header');
                if (guideHeaderEl) guideHeaderEl.textContent = headers[6];
            }
            if (headers[15]) {
                METADATA.supplies_header = headers[15];
                const el = document.getElementById('res-supplies-header');
                if (el) el.textContent = headers[15];
            }
            if (headers[16]) {
                METADATA.notice_header = headers[16];
                const el = document.getElementById('res-notice-header');
                if (el) el.textContent = headers[16];
            }
            return { activity: headers[3], time: headers[4], meeting: headers[5], guide: headers[6], supplies: headers[15], notice: headers[16] };
        }
    } catch (e) {
        console.error("Failed to fetch local CSV header:", e);
    }
    return null;
};

// AUTH INIT
const initAuth = async () => {
    const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
    if (loadingMsg) loadingMsg.textContent = "Connecting...";

    const authTimeout = setTimeout(() => {
        if (loadingMsg) {
            loadingMsg.innerHTML = 'Still connecting... <button onclick="location.reload()" class="underline ml-2">Retry?</button>';
        }
    }, 10000);

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
            await signInWithCustomToken(auth, __initial_auth_token);
            clearTimeout(authTimeout);
        } catch (e) {
            await signInAnonymously(auth).finally(() => clearTimeout(authTimeout));
        }
    } else {
        try {
            await signInAnonymously(auth);
            clearTimeout(authTimeout);
        } catch (e) {
            clearTimeout(authTimeout);
            ui.showConnectionError("Auth Error: " + e.message);
        }
    }
};

if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
            if (loadingMsg) loadingMsg.textContent = "Loading Participant Data...";
            try {
                PARTICIPANTS = await fetchParticipants();
                window.PARTICIPANTS = PARTICIPANTS;
                METADATA = await fetchMetadata() || {};

                if (METADATA.activity_header) {
                    const resEl = document.getElementById('res-activity-title');
                    if (resEl) resEl.textContent = METADATA.activity_header;
                }
                if (METADATA.time_header) {
                    const timeHeaderEl = document.getElementById('res-time-header');
                    if (timeHeaderEl) timeHeaderEl.textContent = METADATA.time_header;
                }
                if (METADATA.guide_header) {
                    const guideHeaderEl = document.getElementById('res-guide-header');
                    if (guideHeaderEl) guideHeaderEl.textContent = METADATA.guide_header;
                }
                if (METADATA.meeting_header) {
                    const el = document.getElementById('res-place-header');
                    if (el) el.textContent = METADATA.meeting_header;
                }
                if (METADATA.summary_header) {
                    const el = document.getElementById('res-summary-header');
                    if (el) el.textContent = METADATA.summary_header;
                }
                if (METADATA.duration_header) {
                    const el = document.getElementById('res-duration-header');
                    if (el) el.textContent = METADATA.duration_header;
                }
                if (METADATA.timeline_time_header) {
                    const el = document.getElementById('res-timeline-time-header');
                    if (el) el.textContent = METADATA.timeline_time_header;
                }
                if (METADATA.supplies_header) {
                    const el = document.getElementById('res-supplies-header');
                    if (el) el.textContent = METADATA.supplies_header;
                }
                if (METADATA.notice_header) {
                    const el = document.getElementById('res-notice-header');
                    if (el) el.textContent = METADATA.notice_header;
                }
                ui.showView('input-view');
            } catch (err) {
                ui.showConnectionError("데이터 연결 실패: " + err.message);
            }
        }
    });
}

// PUBLIC INTERFACE (Window exposed)

const handleLookup = () => {
    (async () => {
        try {
            const nameVal = document.getElementById('name-input')?.value?.trim();

            if (!nameVal) {
                alert("성명을 입력해주세요.");
                return;
            }

            if (PARTICIPANTS.length === 0) {
                PARTICIPANTS = await fetchParticipants();
            }

            // Perform Search (Case-insensitive)
            let user = PARTICIPANTS.find(u => {
                const storedName = (u.name || u.이름 || '').trim().toLowerCase();
                return storedName === nameVal.toLowerCase();
            });

            if (!user) {
                const btn = document.getElementById('verify-btn');
                const originalText = btn ? btn.innerHTML : '';
                if (btn) btn.innerHTML = 'Searching...';

                try {
                    PARTICIPANTS = await fetchParticipants();
                    user = PARTICIPANTS.find(u => {
                        const s = (u.name || u.이름 || '').trim().toLowerCase();
                        return s === nameVal.toLowerCase();
                    });
                } finally {
                    if (btn) btn.innerHTML = originalText;
                }
            }

            if (user) {
                ui.renderResult(user, '',
                    METADATA.activity_header,
                    METADATA.time_header,
                    METADATA.guide_header,
                    METADATA.meeting_header,
                    METADATA.summary_header,
                    METADATA.duration_header,
                    METADATA.timeline_time_header,
                    METADATA.supplies_header,
                    METADATA.notice_header
                );
                ui.showView('result-view');

                // Logging check-in (deferred)
                const sPhone = sanitizePhoneNumber(user.phone || user.휴대전화 || '');
                const userName = user.name || user.이름 || '';
                const checkInId = sPhone || `name_${userName.replace(/[\s\W]/g, '')}`;

                if (checkInId) {
                    checkParticipantStatus(sPhone, userName).then(exists => {
                        if (!exists) {
                            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'checkins', checkInId);
                            setDoc(ref, {
                                name: userName,
                                phone: sPhone,
                                activity: user.activity_name || user.액티비티 || user.bus || 'Activity',
                                department: user.department || user.부서 || '',
                                checkedInAt: new Date().toISOString()
                            });
                        }
                    });
                }
            } else {
                ui.showView('error-view');
            }
        } catch (globalErr) {
            console.error("Lookup Runtime Error:", globalErr);
            debugLog("Runtime Error: " + globalErr.message);
        }
    })();
};

const resetApp = () => {
    const n = document.getElementById('name-input');
    const p = document.getElementById('phone-input');
    const c = document.getElementById('country-code-input');
    if (n) n.value = '';
    if (p) p.value = '';
    if (c) c.value = '82';
    ui.showView('input-view');
};

const toggleAdmin = () => {
    const adminView = document.getElementById('admin-view');
    if (adminView && !adminView.classList.contains('hidden')) {
        ui.showView('input-view');
    } else {
        const modal = document.getElementById('password-modal');
        const input = document.getElementById('password-input');
        if (modal) modal.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
};

window.submitPassword = () => {
    const password = document.getElementById('password-input')?.value;
    if (password === 'admin123') {
        document.getElementById('password-modal')?.classList.add('hidden');
        document.getElementById('password-error')?.classList.add('hidden');

        ui.showView('admin-view');
        // Admin Mode: Now we need the full list
        if (!checkinsUnsubscribe) {
            checkinsUnsubscribe = listenToCheckins((data) => {
                currentCheckins = data;
                window.currentCheckins = currentCheckins; // Expose for testing
                const searchVal = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
                ui.updateAdminDashboard(PARTICIPANTS, currentCheckins, currentSortMode, searchVal);
            });
        }

        // Initial render (might be empty initially until callback fires)
        const searchVal = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
        ui.updateAdminDashboard(PARTICIPANTS, currentCheckins, currentSortMode, searchVal);
    } else {
        document.getElementById('password-error')?.classList.remove('hidden');
    }
};

window.cancelPassword = () => {
    document.getElementById('password-modal')?.classList.add('hidden');
};

window.switchAdminTab = ui.switchAdminTab || ((tab) => {
    const logBtn = document.getElementById('tab-log-btn');
    const statusBtn = document.getElementById('tab-status-btn');
    const logCont = document.getElementById('checkin-log-container');
    const statusCont = document.getElementById('attendance-status-container');

    if (tab === 'log') {
        if (logBtn) logBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft bg-white text-[#00A97A] shadow-sm";
        if (statusBtn) statusBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft text-slate-400 hover:text-slate-600";
        logCont?.classList.remove('hidden');
        statusCont?.classList.add('hidden');
    } else {
        if (statusBtn) statusBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft bg-white text-[#00A97A] shadow-sm";
        if (logBtn) logBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft text-slate-400 hover:text-slate-600";
        statusCont?.classList.remove('hidden');
        logCont?.classList.add('hidden');
        const searchVal = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
        ui.renderAttendanceList(PARTICIPANTS, currentCheckins, currentSortMode, searchVal);
    }
});

window.toggleStats = () => {
    const container = document.getElementById('stats-container');
    const chevron = document.getElementById('stats-chevron');
    if (container?.classList.contains('hidden')) {
        container.classList.remove('hidden');
        chevron?.classList.add('rotate-180');
        ui.renderStats(PARTICIPANTS, currentCheckins);
    } else {
        container?.classList.add('hidden');
        chevron?.classList.remove('rotate-180');
    }
};

window.filterAdminList = () => {
    const searchVal = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
    ui.renderAttendanceList(PARTICIPANTS, currentCheckins, currentSortMode, searchVal);
};

window.sortAttendance = (mode) => {
    currentSortMode = mode;
    ['status', 'name', 'course'].forEach(m => {
        const btn = document.getElementById(`sort-${m}-btn`);
        if (btn) {
            btn.className = (m === mode)
                ? "px-3 py-1.5 bg-[#00A97A] text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-[#00A97A]/20 transition-soft"
                : "px-3 py-1.5 bg-white border border-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg transition-soft";
        }
    });
    const searchVal = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
    ui.renderAttendanceList(PARTICIPANTS, currentCheckins, currentSortMode, searchVal);
};

window.clearCheckins = async () => {
    if (!confirm('This will delete all check-in records. Continue?')) return;
    try { await batchDeleteAll('checkins'); } catch (e) { console.error(e); }
};

window.exportFullReport = () => {
    if (PARTICIPANTS.length === 0) { alert('No data'); return; }
    const checkedMap = new Map();
    currentCheckins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, c);
    });
    const headers = ['Name', 'Phone', 'Department', 'Activity', 'Status', 'Time'];
    const rows = PARTICIPANTS.map(p => {
        const sPhone = sanitizePhoneNumber(p.phone || p.휴대전화 || '');
        const check = checkedMap.get(sPhone);
        return [
            p.name || p.이름,
            p.phone || p.휴대전화 || '',
            p.department || p.부서 || '',
            p.activity_name || p.액티비티 || p.bus || '',
            check ? 'CHECKED-IN' : 'PENDING',
            check ? new Date(check.checkedInAt).toLocaleString('ko-KR') : '-'
        ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
};

// CSV UPLOAD HANDLERS
const dropZone = document.getElementById('drop-zone');
const csvUpload = document.getElementById('csv-upload');
if (dropZone) dropZone.onclick = () => csvUpload?.click();
if (csvUpload) csvUpload.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        const allRows = parseCSV(text);
        if (allRows.length === 0) return;

        const headers = allRows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
        const getIdx = (name) => {
            const idx = headers.findIndex(h => h === name.trim());
            return idx === -1 ? null : idx;
        };

        // Extract Activity Headers (D=3, E=4, G=6)
        const activityHeader = headers[3] || '선택 Activity 안내';
        const timeHeader = headers[4] || '출발';
        const meetingHeader = headers[5] || '장소';
        const guideHeader = headers[6] || '담당';
        const summaryHeader = headers[7] || 'Course 요약';
        const durationHeader = headers[8] || 'Duration';
        const timelineTimeHeader = headers[9] || 'Time';
        const suppliesHeader = headers[15] || '준비물 (Supplies)';
        const noticeHeader = headers[16] || '주의사항 (Notice)';

        const newData = [];
        for (let i = 1; i < allRows.length; i++) {
            const cols = allRows[i];
            if (cols.length === 0) continue;
            const p = {
                // Use the index lookup OR the flexible header lookup
                name: cols[getIdx('이름')] || cols[0] || '',
                department: cols[getIdx('부서')] || cols[1] || '',
                phone: sanitizePhoneNumber(cols[getIdx('휴대전화')] || cols[2] || ''),
                activity_name: cols[getIdx('액티비티')] || cols[3] || '',
                start_time: cols[getIdx('출발시간')] || cols[4] || '',
                meeting_point: cols[getIdx('집합장소')] || cols[5] || '',
                guide_info: cols[getIdx('가이드 정보')] || cols[6] || '',
                course_summary: cols[getIdx('코스 요약')] || cols[7] || '',
                duration: cols[getIdx('듀레이션')] || cols[8] || '',
                time_1: cols[getIdx('타임')] || cols[9] || '',
                schedule_1: cols[getIdx('일정 1')] || cols[10] || '',
                time_2: cols[getIdx('타임 2')] || cols[11] || '',
                schedule_2: cols[getIdx('일정 2')] || cols[12] || '',
                time_3: cols[getIdx('타임 3')] || cols[13] || '',
                schedule_3: cols[getIdx('일정 3')] || cols[14] || '',
                supplies: cols[getIdx('준비물')] || cols[15] || '',
                notice: cols[getIdx('주의사항')] || cols[16] || ''
            };
            newData.push(p);
        }
        if (newData.length > 0) {
            try {
                const msg = document.getElementById('upload-msg');
                if (msg) msg.innerHTML = '<span class="animate-pulse">Starting Sync...</span>';
                await batchUploadParticipants(newData, (pct, status) => {
                    if (msg) msg.innerHTML = `<span class="animate-pulse">${status || 'Syncing'}: ${pct}%</span>`;
                });
                await updateMetadata({
                    activity_header: activityHeader,
                    time_header: timeHeader,
                    meeting_header: meetingHeader,
                    guide_header: guideHeader,
                    summary_header: summaryHeader,
                    duration_header: durationHeader,
                    timeline_time_header: timelineTimeHeader,
                    supplies_header: suppliesHeader,
                    notice_header: noticeHeader
                });
                METADATA = await fetchMetadata() || {};
                PARTICIPANTS = await fetchParticipants();
                if (msg) msg.innerHTML = 'Sync Complete';
                setTimeout(() => { if (msg) msg.innerHTML = ''; }, 4000);
                if (window.lucide) window.lucide.createIcons();
            } catch (error) {
                console.error('Upload error:', error);
                const msg = document.getElementById('upload-msg');
                if (msg) msg.innerText = "Upload Failed";
            }
        }
    };
    reader.readAsText(file);
};

// PASSWORD ENTER KEY
document.getElementById('password-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.submitPassword();
});

document.getElementById('name-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLookup();
});

// STARTUP & LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    // 1. Button Attachments
    const vBtn = document.getElementById('verify-btn');
    if (vBtn) {
        vBtn.addEventListener('click', handleLookup);
        vBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleLookup(); });
    }

    const aBtn = document.getElementById('admin-trigger');
    if (aBtn) {
        aBtn.addEventListener('click', toggleAdmin);
        aBtn.addEventListener('touchend', (e) => { e.preventDefault(); toggleAdmin(); });
    }

    const rBtn = document.getElementById('reset-btn');
    if (rBtn) {
        rBtn.addEventListener('click', resetApp);
        rBtn.addEventListener('touchend', (e) => { e.preventDefault(); resetApp(); });
    }

    // 2. Initial Auth
    if (auth) initAuth();
    if (window.lucide) window.lucide.createIcons();

    // 3. Background Loading (JS-Controlled for Memory Safety)
    setTimeout(() => {
        const img = new Image();
        img.src = 'bg_optimized.jpg';

        img.decode().then(() => {
            const style = document.createElement('style');
            style.innerHTML = `
                #bg-parallax {
                    background-image: url('bg_optimized.jpg') !important;
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
            document.body.classList.add('bg-ready');
            document.getElementById('app')?.classList.add('bg-ready');
            // Initialize parallax after background is ready
            ui.initParallax();
        })
            .catch((err) => {
                console.error("Background decode failed", err);
                const style = document.createElement('style');
                style.innerHTML = `#bg-parallax { opacity: 1 !important; }`;
                document.head.appendChild(style);
                ui.initParallax();
            });
    }, 1000);
});

// FINAL SETUP CHECK (After all exposures)
if (!isConfigured) {
    ui.showView('setup-view');
    initSetup();
    console.warn("System not configured. Redirecting to setup.");
}
