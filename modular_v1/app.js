import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, writeBatch, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I",
        authDomain: "buslookup-5fd0d.firebaseapp.com",
        projectId: "buslookup-5fd0d",
        storageBucket: "buslookup-5fd0d.firebasestorage.app",
        messagingSenderId: "981605729788",
        appId: "1:981605729788:web:942a2188f3985433659e79",
        measurementId: "G-SXL79P93YD"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let PARTICIPANTS = [];
let currentCheckins = [];
let currentSortMode = 'status';
let currentUser = null;
let checkinsUnsubscribe = null;
const BATCH_SIZE = 450;

// ==========================================
// 2. CORE DATA SERVICES (The Engine)
// ==========================================
const initAuth = async () => {
    console.log("System: initAuth started");
    const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
    if (loadingMsg) loadingMsg.textContent = "Connecting to Authentication...";

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
            console.log("System: Attempting custom token auth");
            await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
            console.error("Custom token auth failed", e);
            console.log("System: Falling back to anonymous auth");
            await signInAnonymously(auth);
        }
    } else {
        try {
            console.log("System: Attempting anonymous auth");
            await signInAnonymously(auth);
            console.log("System: Anonymous auth success");
        } catch (e) {
            console.error("System: Auth failed completely", e);
            if (loadingMsg) loadingMsg.textContent = "Auth Failed: " + e.message;
            showConnectionError("Authentication Failed: " + e.message);
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    console.log("System: Auth state changed", user ? "User logged in" : "User logged out");
    if (user) {
        currentUser = user;
        const loadingMsg = document.querySelector('#loading-view p.animate-pulse');
        if (loadingMsg) loadingMsg.textContent = "Loading Participant Data...";
        await loadGlobalData();
    }
});

async function loadGlobalData() {
    try {
        if (!currentUser) {
            console.warn("System: No current user, skipping load");
            return;
        }
        const dataCol = collection(db, 'artifacts', appId, 'public', 'data', 'participants');
        console.log("System: Fetching participants...");
        const snapshot = await getDocs(dataCol);
        PARTICIPANTS = snapshot.docs.map(d => d.data());
        console.log(`System: Loaded ${PARTICIPANTS.length} participants.`);

        if (!document.getElementById('loading-view').classList.contains('hidden')) {
            window.showView('input-view');
        }
    } catch (error) {
        console.error("Data load failed:", error);
        showConnectionError("데이터 연결 실패: " + error.message);
    }
}

function subscribeToCheckins() {
    if (checkinsUnsubscribe) return;
    try {
        const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
        const q = query(checkinsRef, orderBy('checkedInAt', 'desc'));
        checkinsUnsubscribe = onSnapshot(q, (snapshot) => {
            currentCheckins = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateAdminDashboard();
        }, (error) => console.error('Check-in listener error:', error));
    } catch (error) {
        console.error('Failed to subscribe to check-ins:', error);
    }
}

async function batchDeleteAll(collectionName) {
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;
    const chunks = chunkArray(snapshot.docs, BATCH_SIZE);
    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}

async function batchUploadParticipants(newData) {
    await batchDeleteAll('participants');
    const chunks = chunkArray(newData, BATCH_SIZE);
    let globalIndex = 0;
    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(p => {
            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'participants', `p_${globalIndex++}`);
            batch.set(ref, p);
        });
        await batch.commit();
    }
}

// ==========================================
// 3. BUSINESS LOGIC (The Brain)
// ==========================================
function sanitizePhoneNumber(input) {
    if (!input) return '';
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('82')) digits = digits.substring(2);
    if (digits.startsWith('010')) digits = digits.substring(1);
    return digits;
}

function parseCSVLine(text) {
    const re_value = /(?!\s*$)\s*(?:'([^']*(?:''[^']*)*)'|"([^"]*(?:""[^"]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    const a = [];
    text.replace(re_value, (m0, m1, m2, m3) => {
        if (m1 !== undefined) a.push(m1.replace(/''/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/""/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

function getStats() {
    const stats = {};
    const checkedMap = new Map();
    currentCheckins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, true);
    });

    PARTICIPANTS.forEach(p => {
        let activity = p.activity_name || p.액티비티 || p.bus || 'Unknown';
        if (activity.includes(':')) activity = activity.split(':')[0].trim();

        if (!stats[activity]) stats[activity] = { total: 0, checked: 0 };
        stats[activity].total++;
        const sPhone = sanitizePhoneNumber(p.phone || p.휴대전화 || '');
        if (checkedMap.has(sPhone)) stats[activity].checked++;
    });
    return stats;
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// ==========================================
// 4. UI RENDERING (The Face)
// ==========================================
function showConnectionError(msg) {
    const errorView = document.getElementById('error-view');
    const title = errorView.querySelector('h2');
    const desc = errorView.querySelector('p');
    if (title) title.textContent = '연결 오류';
    if (desc) desc.textContent = msg;
    window.showView('error-view');
}

function renderResult(user, inputName) {
    document.getElementById('res-name').textContent = user.name || user.이름 || inputName;
    document.getElementById('res-dept').textContent = user.department || user.부서 || '';
    document.getElementById('res-activity-detail').textContent = user.activity_name || user.액티비티 || user.bus || '-';
    document.getElementById('res-time').textContent = user.start_time || user.출발시간 || '-';
    document.getElementById('res-location').textContent = user.meeting_point || user.집합장소 || '-';
    document.getElementById('res-guide').textContent = user.guide_info || user['가이드 정보'] || '-';

    const timelineContainer = document.getElementById('timeline-container');
    const schedules = [user.schedule_1 || user['일정 1'], user.schedule_2 || user['일정 2'], user.schedule_3 || user['일정 3']].filter(s => s && s.trim());

    if (schedules.length > 0) {
        timelineContainer.innerHTML = schedules.map((s, idx) => `
                    <div class="flex gap-4 items-start relative group">
                        <div class="flex flex-col items-center flex-none">
                            <div class="w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-[#00A97A]' : 'bg-slate-200'} z-10 shadow-sm border-2 border-white transition-soft group-hover:scale-125"></div>
                            ${idx !== schedules.length - 1 ? '<div class="w-px h-12 bg-slate-100 -mt-0.5"></div>' : ''}
                        </div>
                        <div class="pb-8"><p class="text-[11px] font-bold text-slate-800 leading-relaxed transition-soft group-hover:text-slate-900">${s}</p></div>
                    </div>
                `).join('');
    } else {
        timelineContainer.innerHTML = '<p class="text-slate-400 text-xs">No schedule available</p>';
    }

    const supplies = user.supplies || user.준비물;
    const notice = user.notice || user.주의사항;
    const noticeBox = document.getElementById('notice-box');
    if (supplies || notice) {
        noticeBox.classList.remove('hidden');
        noticeBox.querySelector('#notice-supplies span').textContent = supplies || '';
        noticeBox.querySelector('#notice-warning span').textContent = notice || '';
        noticeBox.querySelector('#notice-supplies').style.display = supplies ? 'flex' : 'none';
        noticeBox.querySelector('#notice-warning').style.display = notice ? 'flex' : 'none';
    } else {
        noticeBox.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
}

function updateAdminDashboard() {
    document.getElementById('admin-total-count').textContent = PARTICIPANTS.length;
    document.getElementById('admin-checked-count').textContent = currentCheckins.length;

    const logEl = document.getElementById('checkin-log');
    if (currentCheckins.length === 0) {
        logEl.innerHTML = '<p class="text-slate-400 text-center py-10 text-[10px] font-black uppercase tracking-widest">No Activity Logged</p>';
    } else {
        logEl.innerHTML = currentCheckins.map(c => {
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
    renderAttendanceList();
    if (!document.getElementById('stats-container').classList.contains('hidden')) {
        renderStats();
    }
    if (window.lucide) lucide.createIcons();
}

function renderStats() {
    const stats = getStats();
    const container = document.getElementById('stats-container');
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

function renderAttendanceList() {
    const listEl = document.getElementById('attendance-list');
    const searchVal = document.getElementById('admin-search-input').value.toLowerCase().trim();

    if (PARTICIPANTS.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 text-center py-8">Upload CSV first</p>';
        return;
    }

    const checkedMap = new Map();
    currentCheckins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, c);
    });

    const displayData = PARTICIPANTS
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
        if (currentSortMode === 'status') {
            if (a.isChecked === b.isChecked) return (a.name || a.이름 || '').localeCompare(b.name || b.이름 || '');
            return a.isChecked ? 1 : -1;
        } else if (currentSortMode === 'course') {
            const courseA = (a.activity_name || a.액티비티 || a.bus || '').toLowerCase();
            const courseB = (b.activity_name || b.액티비티 || b.bus || '').toLowerCase();
            if (courseA === courseB) {
                return (a.name || a.이름 || '').localeCompare(b.name || b.이름 || '');
            }
            return courseA.localeCompare(courseB);
        }
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

// ==========================================
// 5. PUBLIC INTERFACE (The Window Bridge)
// ==========================================

window.showView = (id) => {
    ['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view'].forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');

    const adminIcon = document.getElementById('admin-icon');
    const adminTrigger = document.getElementById('admin-trigger');

    if (id === 'admin-view') {
        adminIcon.setAttribute('data-lucide', 'x');
        adminTrigger.classList.add('bg-slate-900', 'border-slate-900');
        subscribeToCheckins();
    } else {
        adminIcon.setAttribute('data-lucide', 'settings');
        adminTrigger.classList.remove('bg-slate-900', 'border-slate-900');
    }
    if (window.lucide) lucide.createIcons();
};

window.handleLookup = async () => {
    const nameInput = document.getElementById('name-input').value.trim();
    const phoneInput = document.getElementById('phone-input').value;
    const countryCodeInput = document.getElementById('country-code-input').value; // Default "82"

    // Combine them for the check: "82" + "010..." -> "82010..."
    const combinedPhone = countryCodeInput + phoneInput;
    const sanitizedPhone = sanitizePhoneNumber(combinedPhone);

    if (!phoneInput) { alert("연락처를 입력해주세요."); return; }

    const user = PARTICIPANTS.find(u => {
        const storedPhone = sanitizePhoneNumber(u.phone || u.휴대전화 || '');
        return storedPhone === sanitizedPhone;
    });

    if (user) {
        renderResult(user, nameInput);
        const alreadyChecked = currentCheckins.some(c => sanitizePhoneNumber(c.phone) === sanitizedPhone);
        if (!alreadyChecked) {
            try {
                const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
                await addDoc(checkinsRef, {
                    name: user.name || user.이름 || nameInput,
                    phone: sanitizedPhone,
                    activity: user.activity_name || user.액티비티 || user.bus || 'Activity',
                    department: user.department || user.부서 || '',
                    checkedInAt: new Date().toISOString()
                });
            } catch (e) { console.error("Checkin log failed", e); }
        }
        window.showView('result-view');
    } else {
        window.showView('error-view');
    }
};

window.resetApp = () => {
    document.getElementById('name-input').value = '';
    document.getElementById('phone-input').value = '';
    document.getElementById('country-code-input').value = '82'; // Reset to default
    window.showView('input-view');
};

window.toggleAdmin = () => {
    const adminView = document.getElementById('admin-view');
    if (adminView && !adminView.classList.contains('hidden')) {
        window.showView('input-view');
    } else {
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('password-input').value = '';
        document.getElementById('password-input').focus();
    }
};

window.submitPassword = () => {
    const password = document.getElementById('password-input').value;
    if (password === 'admin123') {
        document.getElementById('password-modal').classList.add('hidden');
        document.getElementById('password-error').classList.add('hidden');
        window.showView('admin-view');
    } else {
        document.getElementById('password-error').classList.remove('hidden');
    }
};

window.cancelPassword = () => {
    document.getElementById('password-modal').classList.add('hidden');
};

window.switchAdminTab = (tab) => {
    const logBtn = document.getElementById('tab-log-btn');
    const statusBtn = document.getElementById('tab-status-btn');
    const logCont = document.getElementById('checkin-log-container');
    const statusCont = document.getElementById('attendance-status-container');

    if (tab === 'log') {
        logBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft bg-white text-[#00A97A] shadow-sm";
        statusBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft text-slate-400 hover:text-slate-600";
        logCont.classList.remove('hidden');
        statusCont.classList.add('hidden');
    } else {
        statusBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft bg-white text-[#00A97A] shadow-sm";
        logBtn.className = "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft text-slate-400 hover:text-slate-600";
        statusCont.classList.remove('hidden');
        logCont.classList.add('hidden');
        renderAttendanceList();
    }
};

window.toggleStats = () => {
    const container = document.getElementById('stats-container');
    const chevron = document.getElementById('stats-chevron');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        renderStats();
    } else {
        container.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    }
};

window.filterAdminList = () => {
    renderAttendanceList();
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
    renderAttendanceList();
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
document.getElementById('drop-zone').onclick = () => document.getElementById('csv-upload').click();
document.getElementById('csv-upload').onchange = async (e) => {
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
                name: cols[getIdx('이름')] || cols[0] || '',
                department: cols[getIdx('부서')] || cols[1] || '',
                phone: sanitizePhoneNumber(cols[getIdx('휴대전화')] || cols[2] || ''),
                activity_name: cols[getIdx('액티비티')] || cols[3] || '',
                start_time: cols[getIdx('출발시간')] || cols[4] || '',
                meeting_point: cols[getIdx('집합장소')] || cols[5] || '',
                guide_info: cols[getIdx('가이드 정보')] || cols[6] || '',
                schedule_1: cols[getIdx('일정 1')] || cols[7] || '',
                schedule_2: cols[getIdx('일정 2')] || cols[8] || '',
                schedule_3: cols[getIdx('일정 3')] || cols[9] || '',
                supplies: cols[getIdx('준비물')] || cols[10] || '',
                notice: cols[getIdx('주의사항')] || cols[11] || ''
            };
            newData.push(p);
        }
        if (newData.length > 0) {
            try {
                document.getElementById('upload-msg').innerHTML = '<span class="animate-pulse">Syncing...</span>';
                await batchUploadParticipants(newData);
                await loadGlobalData();
                document.getElementById('upload-msg').innerHTML = 'Done';
                setTimeout(() => document.getElementById('upload-msg').innerHTML = '', 4000);
                if (window.lucide) lucide.createIcons();
            } catch (error) {
                console.error('Upload error:', error);
                document.getElementById('upload-msg').innerText = "Upload Failed";
            }
        }
    };
    reader.readAsText(file);
};

// PASSWORD ENTER KEY
document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.submitPassword();
});

// STARTUP
initAuth();
if (window.lucide) lucide.createIcons();
