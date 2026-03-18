// Version: 1.0.1 - Deployment Refresh
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

// AUTH INIT
const initAuth = async () => {
    console.log("System: initAuth started");
    const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
    if (loadingMsg) loadingMsg.textContent = "Connecting to Authentication...";

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
            await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
            console.error("Custom token auth failed", e);
            await signInAnonymously(auth);
        }
    } else {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("System: Auth failed", e);
            ui.showConnectionError("Authentication Failed: " + e.message);
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
        // We no longer fetch all participants on load to prevent data leakage.
        if (loadingMsg) loadingMsg.textContent = "Ready.";
        ui.showView('input-view');
    }
});

// PUBLIC INTERFACE (Window exposed)
window.showView = ui.showView;

window.handleLookup = async () => {
    const phoneInput = document.getElementById('phone-input')?.value;
    const countryCodeInput = document.getElementById('country-code-input')?.value || '82';

    if (!phoneInput) { alert("연락처를 입력해주세요."); return; }

    const combinedPhone = countryCodeInput + phoneInput;
    const sanitizedPhone = sanitizePhoneNumber(combinedPhone);

    const btn = document.getElementById('verify-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span class="animate-spin">↻</span> Searching...';

    try {
        // Fetch ONLY this participant from the server
        console.log("Searching for participant...");
        const results = await fetchParticipants(sanitizedPhone);
        const user = results[0];

        if (user) {
            ui.renderResult(user, '');

            // Check-in logic
            const isAlreadyCheckedIn = await checkParticipantStatus(sanitizedPhone);
            if (!isAlreadyCheckedIn) {
                const checkinDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'checkins', sanitizedPhone);
                await setDoc(checkinDocRef, {
                    name: user.name || user.이름 || '',
                    phone: sanitizedPhone,
                    activity: user.activity_name || user.액티비티 || user.bus || 'Activity',
                    department: user.department || user.부서 || '',
                    checkedInAt: new Date().toISOString()
                });
            }
            ui.showView('result-view');
        } else {
            ui.showView('error-view');
        }
    } catch (e) {
        console.error("Lookup failed", e);
        ui.showConnectionError("Search Error. Please try again.");
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

window.resetApp = () => {
    const n = document.getElementById('name-input');
    const p = document.getElementById('phone-input');
    const c = document.getElementById('country-code-input');
    if (n) n.value = '';
    if (p) p.value = '';
    if (c) c.value = '82';
    ui.showView('input-view');
};

window.toggleAdmin = () => {
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

window.submitPassword = async () => {
    const password = document.getElementById('password-input')?.value;
    const errorEl = document.getElementById('password-error');

    try {
        const { verifyAdmin } = await import('./js/services.js');
        const isValid = await verifyAdmin(password);

        if (isValid) {
            document.getElementById('password-modal')?.classList.add('hidden');
            errorEl?.classList.add('hidden');
            ui.showView('admin-view');

            // Admin Mode: Load data only after verification
            PARTICIPANTS = await fetchParticipants();
            
            if (!checkinsUnsubscribe) {
                checkinsUnsubscribe = listenToCheckins((data) => {
                    currentCheckins = data;
                    ui.updateAdminDashboard(PARTICIPANTS, currentCheckins, currentSortMode, '');
                });
            }
            ui.updateAdminDashboard(PARTICIPANTS, currentCheckins, currentSortMode, '');
        } else {
            errorEl?.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Admin verification failed", e);
        errorEl?.classList.remove('hidden');
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
                bus: cols[getIdx('액티비티')] || cols[3] || '', // Add 'bus' for legacy support/stats
                start_time: cols[getIdx('출발시간')] || cols[4] || '',
                meeting_point: cols[getIdx('집합장소')] || cols[5] || '',
                guide_info: cols[getIdx('가이드 정보')] || cols[6] || '',
                // Flexible matching for schedules
                schedule_1: cols[getIdx('코스 요약')] || cols[getIdx('일정 1')] || cols[getIdx('일정1')] || cols[7] || '',
                schedule_2: cols[getIdx('듀레이션')] || cols[getIdx('일정 2')] || cols[getIdx('일정2')] || cols[8] || '',
                schedule_3: cols[getIdx('타임')] || cols[getIdx('일정 3')] || cols[9] || '',
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

// STARTUP
initAuth();
if (window.lucide) window.lucide.createIcons();
