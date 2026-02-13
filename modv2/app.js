// Version: 1.1.1 - Background Optimization & Logic Fix
import { auth, db, appId } from './js/config.js';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { fetchParticipants, listenToCheckins, batchUploadParticipants, batchDeleteAll, checkParticipantStatus } from './js/services.js';
import { sanitizePhoneNumber, parseCSVLine, getSafeHeader } from './js/utils.js';
import * as ui from './js/ui.js';

// STATE
let PARTICIPANTS = [];
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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
        if (loadingMsg) loadingMsg.textContent = "Loading Participant Data...";
        try {
            PARTICIPANTS = await fetchParticipants();
            window.PARTICIPANTS = PARTICIPANTS;
            ui.showView('input-view');
        } catch (err) {
            ui.showConnectionError("데이터 연결 실패: " + err.message);
        }
    }
});

// PUBLIC INTERFACE (Window exposed)
window.showView = ui.showView;

const handleLookup = () => {
    (async () => {
        try {
            const phoneVal = document.getElementById('phone-input')?.value;
            const codeVal = document.getElementById('country-code-input')?.value;

            if (!phoneVal) {
                alert("연락처를 입력해주세요.");
                return;
            }

            const combinedPhone = (codeVal || '') + phoneVal;
            const sanitizedPhone = sanitizePhoneNumber(combinedPhone);

            if (PARTICIPANTS.length === 0) {
                PARTICIPANTS = await fetchParticipants();
            }

            // Perform Search
            let user = PARTICIPANTS.find(u => {
                const storedRaw = u.phone || u.휴대전화 || '';
                const storedSanitized = sanitizePhoneNumber(storedRaw);
                return storedSanitized === sanitizedPhone;
            });

            if (!user) {
                const btn = document.getElementById('verify-btn');
                const originalText = btn ? btn.innerHTML : '';
                if (btn) btn.innerHTML = 'Checking...';

                try {
                    PARTICIPANTS = await fetchParticipants();
                    user = PARTICIPANTS.find(u => {
                        const s = sanitizePhoneNumber(u.phone || u.휴대전화 || '');
                        return s === sanitizedPhone;
                    });
                } finally {
                    if (btn) btn.innerHTML = originalText;
                }
            }

            if (user) {
                ui.renderResult(user, '');
                ui.showView('result-view');

                // Logging check-in (deferred)
                checkParticipantStatus(sanitizedPhone).then(exists => {
                    if (!exists) {
                        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'checkins', sanitizedPhone);
                        setDoc(ref, {
                            name: user.name || user.이름 || '',
                            phone: sanitizedPhone,
                            activity: user.activity_name || user.액티비티 || user.bus || 'Activity',
                            department: user.department || user.부서 || '',
                            checkedInAt: new Date().toISOString()
                        });
                    }
                });
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
    const p = document.getElementById('phone-input');
    const c = document.getElementById('country-code-input');
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
        const lines = text.split('\n');
        const headerLine = lines[0].trim();
        const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^\uFEFF/, ''));
        const getIdx = (name) => {
            const idx = headers.findIndex(h => h === name.trim());
            return idx === -1 ? null : idx;
        };
        const newData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = parseCSVLine(line);
            const p = {
                // Use the index lookup OR the flexible header lookup
                name: cols[getIdx('이름')] || cols[0] || '',
                department: cols[getIdx('부서')] || cols[1] || '',
                phone: sanitizePhoneNumber(cols[getIdx('휴대전화')] || cols[2] || ''),
                activity_name: cols[getIdx('액티비티')] || cols[3] || '',
                start_time: cols[getIdx('출발시간')] || cols[4] || '',
                meeting_point: cols[getIdx('집합장소')] || cols[5] || '',
                guide_info: cols[getIdx('가이드 정보')] || cols[6] || '',
                // Flexible matching for schedules
                schedule_1: cols[getIdx('일정 1')] || cols[getIdx('일정1')] || cols[7] || '',
                schedule_2: cols[getIdx('일정 2')] || cols[getIdx('일정2')] || cols[8] || '',
                schedule_3: cols[getIdx('일정 3')] || cols[9] || '',
                supplies: cols[getIdx('준비물')] || cols[10] || '',
                notice: cols[getIdx('주의사항')] || cols[11] || ''
            };
            newData.push(p);
        }
        if (newData.length > 0) {
            try {
                const msg = document.getElementById('upload-msg');
                if (msg) msg.innerHTML = '<span class="animate-pulse">Starting Sync...</span>';
                await batchUploadParticipants(newData, (pct) => {
                    if (msg) msg.innerHTML = `<span class="animate-pulse">Syncing: ${pct}%</span>`;
                });
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
    initAuth();
    if (window.lucide) window.lucide.createIcons();

    // 3. Background Loading (JS-Controlled for Memory Safety)
    setTimeout(() => {
        const img = new Image();
        img.src = 'bg_optimized.jpg';

        img.decode().then(() => {
            const style = document.createElement('style');
            style.innerHTML = `body::before {
                background: url('bg_optimized.jpg') no-repeat top center !important;
                background-size: cover !important;
                position: fixed !important;
                opacity: 1 !important;
                transition: opacity 1.5s ease-in-out !important;
            }`;
            document.head.appendChild(style);
        }).catch((err) => {
            console.error("Background decode failed", err);
            const style = document.createElement('style');
            style.innerHTML = `body::before { opacity: 1 !important; }`;
            document.head.appendChild(style);
        });
    }, 1000);
});
