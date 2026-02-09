# Project Context: Bus Lookup ModV2

Generated on 02/05/2026 19:18:09



## File: FULL_PROJECT_MAP.md
```markdown
# Global Project Map & Architecture (Comprehensive)

This document maps the entire `Bus_Lookup` repository, explaining its evolution, file structure, and technical mechanisms from the ground up.

## 1. Project Evolution (Timeline)

The project evolved from a simple direct-deployment model to a highly modular architecture for stability and maintainability.

| Phase | Directory/Files | Status | Key Change |
| :--- | :--- | :--- | :--- |
| **Genesis** | `index_old.html` | Archived | Original MVP (Minimum Viable Product). |
| **V1 Production** | `index.html`, `app.js`, `js/` | Stable | The currently deployed version on GitHub Pages. Single-layer logic. |
| **Modular V1** | `modular_v1/` | Ref Area | First attempt to separate logic into modules (`services.js`, `ui.js`). |
| **Modular V2** | `modv2/` | **Current** | **Recommended Production Code.** Hardened security, robust CSV parsing, and "Hail Mary" re-fetch fallbacks. |
| **Failed Path** | `modular_v2(failed)/` | Trash | Attempted complex Auth/Firestore logic that was too heavy for short-lived events. |

## 2. Directory Map (Everything Connected)

### Core Code Folders

- **`/modv2`**: The latest, most stable code. Uses modern ESM (modules).
  - `index.html`: The entry point.
  - `app.js`: Main logic core.
  - `js/config.js`: Firebase keys & App isolation.
  - `js/services.js`: Database operations (Fetch/Listen/Batch).
  - `js/ui.js`: Visual rendering & View management.
  - `js/utils.js`: Helper functions (Phone sanitization, flexible CSV header matching).
- **`/js` & Root Files**: The previous iteration. Used when the app was simpler.
- **`/test_v1` & `/test_isolation`**: Temporary environments for testing specific bugs before patching main code.

### Data & Scripts

- **`participants_data.csv`**: The master data template.
- **`update_hong_v...ps1/js`**: Special automation scripts used to update records for specific participants (like 'Hong') without using the UI.

### References & Ref

- **`/ref`**: Contains screenshots, icons, and original design documents.
- **`/automation`**: Tools used by the development agent to maintain the project.

---

## 3. How It Works: The "Look & Check" Engine

The app is built as a **Serverless Web Application**. There is NO backend server code; it runs entirely in the user's browser.

### Step 1: Initialization

1. Browser loads `index.html`.
2. `initAuth()` (in `app.js`) connects to **Firebase Auth** anonymously.
3. `fetchParticipants()` (in `services.js`) downloads the current attendee list from **Firestore**.

### Step 2: The Lookup Logic (Search)

When a user enters their name/phone:

1. **Sanitization**: `sanitizePhoneNumber` strips spaces, dashes, and country codes for a "clean" comparison.
2. **Memory Search**: It first checks the data downloaded in Step 1.
3. **The "Hail Mary" (ModV2 specific)**: If not found, it performs an *emergency download* from the server. This ensures that if the Admin JUST uploaded a CSV a second ago, the user can still find themselves.

### Step 3: Check-in & Result

1. If found, `ui.renderResult` populates the dynamic itinerary.
2. The app writes a "Check-in" record to Firestore at:
    `artifacts/[appId]/public/data/checkins/[phone_number]`
3. This record prevents double-check-ins and provides the Admin with real-time stats.

---

## 4. Integration Map

```mermaid
graph TD
    subgraph Local[Your Computer]
        CSV[Participants CSV]
        Launcher[run_app.bat]
        Code[modv2 Files]
    end

    subgraph Cloud[Infrastructure]
        GH[GitHub Pages]
        FB[Firebase Console]
    end

    subgraph Service[Backend Services]
        Firestore[(Firestore DB)]
        Auth[Firebase Auth]
    end

    Launcher -- "Helper Server" --> Code
    CSV -- "Import" --> Code
    Code -- "Read/Write" --> Firestore
    Code -- "Verify" --> Auth
    GH -- "Hosts" --> Root_Code[Root index.html]
```

## 5. Summary for AI Agents

- **Target Prod**: `modv2/`
- **Data Path**: `artifacts/b-braun-event-2026-production/public/data/`
- **Primary Match Key**: Sanitized Phone Number (last 8-11 digits).
- **Logic Style**: Modular ESM with functional separation (UI vs. Data Services).

```

## File: index.html
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Check-In Portal</title>
    <meta name="description" content="Corporate activity selection and itinerary lookup portal">
    <link rel="stylesheet" href="./styles.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>

<body class="bg-slate-100 min-h-screen flex flex-col items-center p-4 sm:p-8">
    <div id="app"
        class="w-full max-w-md bg-white rounded-[3rem] shadow-premium border border-slate-200/60 min-h-[600px] flex flex-col relative overflow-hidden">

        <!-- HEADER -->
        <div
            class="bg-white/80 backdrop-blur-md px-8 py-7 flex justify-between items-center relative border-b border-slate-100/10 z-50">
            <div class="flex items-center gap-4">
                <div
                    class="w-11 h-11 bg-gradient-to-tr from-[#00A97A] to-[#00C896] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00A97A]/20">
                    <i data-lucide="building-2" class="w-6 h-6 text-white"></i>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-[#00A97A] tracking-[0.25em] leading-none mb-1">B.
                        Braun</span>
                    <span
                        class="text-xs font-heading font-black text-slate-900 tracking-tight uppercase leading-none">Activity
                        Portal</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div id="admin-trigger" onclick="toggleAdmin()"
                    class="group cursor-pointer bg-slate-50 hover:bg-slate-900 p-2.5 rounded-xl transition-soft border border-slate-100 shadow-sm hover:shadow-lg active:scale-95">
                    <i data-lucide="settings" id="admin-icon"
                        class="w-5 h-5 text-slate-400 group-hover:text-white transition-soft"></i>
                </div>
            </div>
        </div>

        <!-- DECORATION -->
        <div class="absolute -top-10 -left-10 w-40 h-40 bg-[#00A97A]/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-[#9E2AB5]/10 rounded-full blur-3xl"></div>

        <div class="p-8 relative min-h-[400px] flex flex-col" id="content-area">

            <!-- VIEW: LOADING -->
            <div id="loading-view" class="flex flex-col items-center justify-center py-24 space-y-8">
                <div class="relative">
                    <div class="w-16 h-16 border-[3px] border-slate-100 rounded-full"></div>
                    <div
                        class="absolute inset-0 w-16 h-16 border-[3px] border-[#00A97A] border-t-transparent rounded-full animate-spin">
                    </div>
                </div>
                <div class="text-center space-y-2">
                    <p class="text-[10px] text-[#00A97A] font-black uppercase tracking-[0.3em] animate-pulse">
                        Establishing Secure Link</p>
                    <p class="text-[8px] text-slate-300 font-bold uppercase tracking-widest">B. BRAUN CLOUD SERVICES</p>
                </div>
            </div>

            <!-- VIEW: ADMIN DASHBOARD -->
            <div id="admin-view" class="hidden slide-in space-y-6">
                <div class="text-center">
                    <h2 class="text-xl font-heading font-black text-slate-900 tracking-tight uppercase">Admin Dashboard
                    </h2>
                    <p class="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Management Console
                    </p>
                </div>

                <!-- Stats Summary -->
                <div class="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div
                        class="flex-1 flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-50 shadow-sm">
                        <span
                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registrations</span>
                        <span id="admin-total-count" class="text-sm font-black text-slate-900">0</span>
                    </div>
                    <div
                        class="flex-1 flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <span class="text-[9px] font-black text-[#00A97A] uppercase tracking-widest">Checked-In</span>
                        <span id="admin-checked-count" class="text-sm font-black text-[#00A97A]">0</span>
                    </div>
                </div>

                <!-- Detailed Stats Accordion -->
                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-0" id="stats-wrapper">
                    <div class="flex items-center justify-between cursor-pointer" onclick="toggleStats()">
                        <h4
                            class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <i data-lucide="bar-chart-2" class="w-3 h-3"></i> Activity Statistics
                        </h4>
                        <i data-lucide="chevron-down" id="stats-chevron"
                            class="w-3 h-3 text-slate-400 transition-transform"></i>
                    </div>
                    <div id="stats-container"
                        class="hidden grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar mt-3">
                        <!-- Stats injected here -->
                    </div>
                </div>

                <!-- List & Search -->
                <div class="space-y-4">
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400"></i>
                        </div>
                        <input type="text" id="admin-search-input" onkeyup="filterAdminList()"
                            placeholder="Search Name or Phone..."
                            class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-[#00A97A] focus:bg-white transition-soft placeholder:text-slate-300 uppercase tracking-wider">
                    </div>

                    <div class="flex items-center justify-between gap-4">
                        <div class="flex bg-slate-100 p-1 rounded-xl">
                            <button onclick="switchAdminTab('status')" id="tab-status-btn"
                                class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft bg-white text-[#00A97A] shadow-sm">List</button>
                            <button onclick="switchAdminTab('log')" id="tab-log-btn"
                                class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-soft text-slate-400 hover:text-slate-600">Log</button>
                        </div>
                        <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                            <button onclick="sortAttendance('status')" id="sort-status-btn"
                                class="px-3 py-1.5 bg-[#00A97A] text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-[#00A97A]/20 transition-soft">Status</button>
                            <button onclick="sortAttendance('name')" id="sort-name-btn"
                                class="px-3 py-1.5 bg-white border border-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg transition-soft">Name</button>
                            <button onclick="sortAttendance('course')" id="sort-course-btn"
                                class="px-3 py-1.5 bg-white border border-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg transition-soft">Course</button>
                        </div>
                    </div>

                    <div id="attendance-status-container">
                        <div id="attendance-list" class="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            <p class="text-slate-400 text-center py-10 text-[10px] font-bold uppercase tracking-widest">
                                Loading status...</p>
                        </div>
                    </div>
                </div>

                <div id="checkin-log-container" class="hidden space-y-3">
                    <div id="checkin-log" class="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-[10px]">
                        <p class="text-slate-400 text-center py-10 font-bold uppercase tracking-widest">Loading log...
                        </p>
                    </div>
                </div>

                <!-- Admin Actions -->
                <div id="admin-actions-toolbar" class="flex gap-2 mt-4">
                    <button onclick="exportFullReport()"
                        class="flex-1 py-3 text-[9px] font-black text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-[#00A97A] hover:text-[#00A97A] transition-soft uppercase tracking-widest">
                        <i data-lucide="download" class="w-3 h-3 inline-block mr-1 mb-0.5"></i> Export
                    </button>
                    <button onclick="clearCheckins()"
                        class="flex-1 py-3 text-[9px] font-black text-rose-400 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-soft uppercase tracking-widest">
                        <i data-lucide="trash-2" class="w-3 h-3 inline-block mr-1 mb-0.5"></i> Clear
                    </button>
                </div>

                <!-- CSV Upload -->
                <div class="space-y-4 pt-4">
                    <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center hover:bg-slate-100/50 cursor-pointer transition-soft group"
                        id="drop-zone">
                        <div class="flex items-center justify-center gap-3">
                            <i data-lucide="upload-cloud" class="w-4 h-4 text-slate-400 group-hover:text-[#00A97A]"></i>
                            <p class="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Update Database
                                (CSV)</p>
                        </div>
                        <input type="file" id="csv-upload" accept=".csv" class="hidden"
                            aria-label="Upload Participant CSV">
                    </div>
                    <div id="upload-msg"
                        class="text-center text-[10px] font-black uppercase tracking-widest h-4 text-[#00A97A]"></div>
                    <button onclick="showView('input-view')"
                        class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-[0.3em] uppercase shadow-2xl hover:-translate-y-1 transition-soft">EXIT
                        CONSOLE</button>
                </div>
            </div>

            <!-- VIEW: INPUT (LOGIN) -->
            <div id="input-view" class="hidden slide-in flex flex-col flex-1">
                <div class="space-y-10">
                    <div class="space-y-6">
                        <div class="space-y-2">
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile
                                Number</label>
                            <div class="flex gap-2">
                                <!-- Country Code -->
                                <div class="relative w-24 group">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-slate-400 font-bold text-sm">+</span>
                                    </div>
                                    <input type="tel" id="country-code-input" value="82" title="Country Code"
                                        aria-label="Country Code"
                                        class="w-full pl-6 pr-3 py-4 bg-slate-50 border border-slate-100/50 rounded-2xl focus:ring-4 focus:ring-[#00A97A]/10 focus:border-[#00A97A] outline-none transition-soft font-semibold text-slate-800 text-center">
                                </div>
                                <!-- Phone Body -->
                                <div class="relative flex-1 group">
                                    <div
                                        class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-soft group-focus-within:text-[#00A97A]">
                                        <i data-lucide="phone" class="w-5 h-5 text-slate-300"></i>
                                    </div>
                                    <input type="tel" id="phone-input" placeholder="010-0000-0000"
                                        class="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100/50 rounded-2xl focus:ring-4 focus:ring-[#00A97A]/10 focus:border-[#00A97A] outline-none transition-soft placeholder:text-slate-300 font-semibold text-slate-800">
                                </div>
                            </div>
                        </div>

                        <button onclick="handleLookup()" id="verify-btn"
                            class="w-full bg-[#00A97A] text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-[#00A97A]/20 hover:shadow-[#00A97A]/40 hover:-translate-y-0.5 active:translate-y-0 transition-soft flex items-center justify-center gap-3 uppercase tracking-[0.25em] mt-4">
                            <span>?뺤씤</span>
                            <i data-lucide="chevron-right" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- VIEW: RESULT (ITINERARY) -->
            <div id="result-view" class="hidden slide-in space-y-10 flex-1">
                <!-- Header -->
                <div class="text-center pb-5 border-b border-slate-100 relative">
                    <div class="space-y-2">
                        <h3 class="text-3xl font-heading font-black text-slate-900 tracking-tight leading-tight"><span
                                id="res-name" class="text-[#00A97A]">User</span>??/h3>
                        <div
                            class="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                            <div class="w-1.5 h-1.5 rounded-full bg-[#00A97A] animate-pulse"></div>
                            <p id="res-dept" class="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Banner -->
                <div class="group relative rounded-3xl overflow-hidden shadow-2xl h-48">
                    <img src="https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=2070&auto=format&fit=crop"
                        alt="Activity Banner"
                        class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">

                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent">
                    </div>

                    <div class="absolute bottom-0 left-0 p-6 z-10 w-full">
                        <span
                            class="text-[#00A97A] text-[10px] font-black uppercase tracking-widest block mb-1 bg-white/10 backdrop-blur-md inline-block px-2 py-1 rounded-lg">Selected
                            Course</span>
                        <h4 id="res-activity-detail"
                            class="text-xl font-heading font-bold text-white tracking-tight leading-snug drop-shadow-md">
                            Activity Name</h4>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="grid grid-cols-2 gap-4">
                    <div
                        class="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-premium group hover:border-[#00A97A]/30 transition-soft">
                        <div
                            class="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#00A97A]/5 transition-soft">
                            <i data-lucide="clock"
                                class="w-5 h-5 text-slate-400 group-hover:text-[#00A97A] transition-soft"></i>
                        </div>
                        <span
                            class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</span>
                        <span id="res-time" class="text-sm font-black text-slate-900">09:00</span>
                    </div>
                    <div
                        class="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-premium group hover:border-[#00A97A]/30 transition-soft">
                        <div
                            class="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#00A97A]/5 transition-soft">
                            <i data-lucide="map-pin"
                                class="w-5 h-5 text-slate-400 group-hover:text-[#00A97A] transition-soft"></i>
                        </div>
                        <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Meeting
                            Point</span>
                        <span id="res-location" class="text-xs font-bold text-slate-900 truncate block">Lobby</span>
                    </div>
                </div>

                <!-- Guide Bar -->
                <div
                    class="flex items-center gap-6 bg-slate-900 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group">
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-[#00A97A]/10 to-transparent opacity-0 group-hover:opacity-100 transition-soft">
                    </div>
                    <div
                        class="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                        <i data-lucide="user-check" class="w-6 h-6 text-[#00A97A]"></i>
                    </div>
                    <div class="flex-1">
                        <span
                            class="block text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">Assigned
                            Guide</span>
                        <span id="res-guide" class="text-sm font-bold text-white">-</span>
                    </div>
                </div>

                <!-- Timeline -->
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-1.5 h-4 bg-[#00A97A] rounded-full"></div>
                            <h4
                                class="text-xs font-heading font-black text-slate-900 uppercase tracking-widest leading-none">
                                Schedule Summary</h4>
                        </div>
                        <div
                            class="px-2.5 py-1 bg-[#00A97A]/5 rounded-full border border-[#00A97A]/10 flex items-center justify-center">
                            <span
                                class="text-[8px] font-black text-[#00A97A] uppercase tracking-widest leading-none">Real-time</span>
                        </div>
                    </div>
                    <div id="timeline-container" class="space-y-0 relative"></div>
                </div>

                <!-- Notice Box -->
                <div id="notice-box" class="hidden">
                    <div
                        class="bg-amber-50/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-amber-100/50 relative overflow-hidden">
                        <div class="absolute -right-10 -top-10 w-32 h-32 bg-amber-100/20 rounded-full blur-3xl">
                        </div>
                        <div class="flex items-center gap-3 mb-4 text-amber-700">
                            <div class="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                                <i data-lucide="alert-circle" class="w-4 h-4"></i>
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-[0.2em]">Required
                                Information</span>
                        </div>
                        <div class="space-y-4">
                            <div id="notice-supplies" class="flex items-start gap-3">
                                <div class="mt-1.5 w-1 h-1 bg-amber-400 rounded-full flex-none"></div>
                                <p class="text-xs text-amber-900/70 font-semibold leading-relaxed"><span></span></p>
                            </div>
                            <div id="notice-warning" class="flex items-start gap-3">
                                <div class="mt-1.5 w-1 h-1 bg-amber-400 rounded-full flex-none"></div>
                                <p class="text-xs text-amber-900/70 font-semibold leading-relaxed"><span></span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reset -->
                <div class="pb-10 text-center">
                    <button onclick="resetApp()"
                        class="group inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:-translate-y-1 transition-soft active:translate-y-0">
                        <i data-lucide="arrow-left" class="w-4 h-4 group-hover:-translate-x-1 transition-transform"></i>
                        <span>New Search</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- VIEW: ERROR -->
        <div id="error-view"
            class="hidden slide-in flex flex-col items-center justify-center py-16 px-4 text-center space-y-8">
            <div class="relative">
                <div class="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                    <i data-lucide="alert-triangle" class="w-10 h-10 text-rose-400"></i>
                </div>
            </div>
            <div class="space-y-2">
                <h2 class="text-2xl font-heading font-black text-slate-900 tracking-tight uppercase">?뺣낫瑜?李얠쓣 ???놁뒿?덈떎
                </h2>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Please Check Your Name &
                    Phone Number</p>
            </div>
            <button onclick="showView('input-view')"
                class="w-full max-w-[240px] bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] tracking-[0.2em] uppercase shadow-2xl hover:-translate-y-1 transition-soft">?ㅼ떆
                ?쒕룄?섍린</button>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="py-12 px-10 text-center mt-auto">
        <div class="flex flex-col items-center gap-4">
            <div class="flex items-center justify-center gap-3 opacity-30 transition-soft hover:opacity-100">
                <div class="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center">
                    <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-500"></i>
                </div>
                <div class="w-px h-3 bg-slate-200"></div>
                <div class="flex flex-col items-start leading-none">
                    <span class="text-[8px] font-black text-[#00A97A] tracking-wider mb-0.5">B. Braun</span>
                    <span class="text-[8px] font-black text-slate-900 uppercase tracking-widest">Activity Portal</span>
                </div>
            </div>
            <p class="text-[8px] text-slate-300 font-bold uppercase tracking-widest">짤 2026 B. Braun Management
                Korea</p>
        </div>
    </div>
    </div>

    <!-- ADMIN PASSWORD MODAL -->
    <div id="password-modal"
        class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div
            class="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border border-white/20 transform transition-soft">
            <div class="w-16 h-16 bg-[#00A97A]/5 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <i data-lucide="lock" class="w-8 h-8 text-[#00A97A]"></i>
            </div>
            <div class="text-center mb-8">
                <h3 class="text-xl font-heading font-black text-slate-900 tracking-tight uppercase">Admin Access</h3>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Management Console
                    Authentication</p>
            </div>
            <div class="space-y-4">
                <input type="password" id="password-input" placeholder="ACCESS KEY"
                    class="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-center font-black text-xs tracking-[0.3em] outline-none focus:border-[#00A97A] focus:bg-white transition-soft placeholder:text-slate-300">
                <p id="password-error"
                    class="hidden text-rose-500 text-[10px] font-black text-center uppercase tracking-widest">Validation
                    Failed. Retry.</p>
                <div class="flex gap-3 pt-4">
                    <button onclick="cancelPassword()"
                        class="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-soft">Close</button>
                    <button onclick="submitPassword()"
                        class="flex-1 py-4 bg-[#00A97A] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#00A97A]/20 hover:-translate-y-1 transition-soft">Authorize</button>
                </div>
            </div>
        </div>
    </div>

    <script type="module" src="./app.js"></script>
</body>

</html>

```

## File: styles.css
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap');

body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    color: #0f172a;
}

h1,
h2,
h3,
h4,
.font-heading {
    font-family: 'Outfit', sans-serif;
}

.slide-in {
    animation: slideIn 0.4s ease-out forwards;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Timeline & Scrollbar */
.timeline-item {
    position: relative;
    padding-left: 2rem;
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: 0.45rem;
    top: 1.5rem;
    width: 2px;
    height: calc(100% - 0.5rem);
    background: #e2e8f0;
}

.timeline-item:last-child::before {
    display: none;
}

.glass {
    background: rgba(255, 255, 255, 0.7);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.shadow-premium {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02), 0 20px 25px -5px rgba(0, 0, 0, 0.03);
}

.transition-soft {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

::-webkit-scrollbar {
    width: 5px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
}

@supports (scrollbar-width: none) {
    .no-scrollbar {
        scrollbar-width: none;
    }
}

```

## File: app.js
```javascript
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
        if (loadingMsg) loadingMsg.textContent = "Loading Participant Data...";
        try {
            PARTICIPANTS = await fetchParticipants();
            console.log(`System: Loaded ${PARTICIPANTS.length} participants.`);

            PARTICIPANTS = await fetchParticipants();
            window.PARTICIPANTS = PARTICIPANTS; // Expose for testing
            console.log(`System: Loaded ${PARTICIPANTS.length} participants.`);
            ui.showView('input-view');
        } catch (err) {
            ui.showConnectionError("?곗씠???곌껐 ?ㅽ뙣: " + err.message);
        }
    }
});

// PUBLIC INTERFACE (Window exposed)
window.showView = ui.showView;

window.handleLookup = async () => {
    const nameInput = document.getElementById('name-input')?.value.trim();
    const phoneInput = document.getElementById('phone-input')?.value;
    const countryCodeInput = document.getElementById('country-code-input')?.value;

    if (!phoneInput) { alert("?곕씫泥섎? ?낅젰?댁＜?몄슂."); return; }

    const combinedPhone = countryCodeInput + phoneInput;
    const sanitizedPhone = sanitizePhoneNumber(combinedPhone);

    // 1. Try finding them in current memory
    let user = PARTICIPANTS.find(u => {
        const storedPhone = sanitizePhoneNumber(u.phone || u.?대??꾪솕 || '');
        return storedPhone === sanitizedPhone;
    });

    // 2. THE FIX: If not found, fetch fresh data and try again
    if (!user) {
        // Show a temporary loading state on the button
        const btn = document.getElementById('verify-btn');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<span class="animate-spin">??/span> Checking Server...';

        try {
            console.log("User not found locally. Fetching fresh data...");
            PARTICIPANTS = await fetchParticipants();

            // Try finding them again in the fresh list
            user = PARTICIPANTS.find(u => {
                const storedPhone = sanitizePhoneNumber(u.phone || u.?대??꾪솕 || '');
                return storedPhone === sanitizedPhone;
            });
        } catch (e) {
            console.error("Emergency fetch failed", e);
        } finally {
            if (btn) btn.innerHTML = originalText;
        }
    }

    if (user) {
        ui.renderResult(user, nameInput);

        // Optimized Check: Query DB specifically for this user
        const isAlreadyCheckedIn = await checkParticipantStatus(sanitizedPhone);

        if (!isAlreadyCheckedIn) {
            try {
                const checkinDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'checkins', sanitizedPhone);
                await setDoc(checkinDocRef, {
                    name: user.name || user.?대쫫 || nameInput,
                    phone: sanitizedPhone,
                    activity: user.activity_name || user.?≫떚鍮꾪떚 || user.bus || 'Activity',
                    department: user.department || user.遺??|| '',
                    checkedInAt: new Date().toISOString()
                });
            } catch (e) { console.error("Checkin log failed", e); }
            ui.showView('result-view');
        } else {
            ui.showView('error-view');
        }
    } else {
        // Explicitly show error if still not found
        alert("李멸????뺣낫瑜?李얠쓣 ???놁뒿?덈떎. (User Not Found)");
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
        const sPhone = sanitizePhoneNumber(p.phone || p.?대??꾪솕 || '');
        const check = checkedMap.get(sPhone);
        return [
            p.name || p.?대쫫,
            p.phone || p.?대??꾪솕 || '',
            p.department || p.遺??|| '',
            p.activity_name || p.?≫떚鍮꾪떚 || p.bus || '',
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
                name: cols[getIdx('?대쫫')] || cols[0] || '',
                department: cols[getIdx('遺??)] || cols[1] || '',
                phone: sanitizePhoneNumber(cols[getIdx('?대??꾪솕')] || cols[2] || ''),
                activity_name: cols[getIdx('?≫떚鍮꾪떚')] || cols[3] || '',
                start_time: cols[getIdx('異쒕컻?쒓컙')] || cols[4] || '',
                meeting_point: cols[getIdx('吏묓빀?μ냼')] || cols[5] || '',
                guide_info: cols[getIdx('媛?대뱶 ?뺣낫')] || cols[6] || '',
                // Flexible matching for schedules
                schedule_1: cols[getIdx('?쇱젙 1')] || cols[getIdx('?쇱젙1')] || cols[7] || '',
                schedule_2: cols[getIdx('?쇱젙 2')] || cols[getIdx('?쇱젙2')] || cols[8] || '',
                schedule_3: cols[getIdx('?쇱젙 3')] || cols[9] || '',
                supplies: cols[getIdx('以鍮꾨Ъ')] || cols[10] || '',
                notice: cols[getIdx('二쇱쓽?ы빆')] || cols[11] || ''
            };
            newData.push(p);
        }
        if (newData.length > 0) {
            try {
                const msg = document.getElementById('upload-msg');
                if (msg) msg.innerHTML = '<span class="animate-pulse">Syncing...</span>';
                await batchUploadParticipants(newData);
                PARTICIPANTS = await fetchParticipants();
                if (msg) msg.innerHTML = 'Done';
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

```

## File: js/config.js
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Hardcoded to prevent data bleeding into the default bucket
export const appId = 'b-braun-event-2026-production';

```

## File: js/services.js
```javascript
import { db, appId } from './config.js';
import { collection, doc, getDocs, writeBatch, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { chunkArray } from './utils.js';

const BATCH_SIZE = 450;

export async function fetchParticipants() {
    const dataCol = collection(db, 'artifacts', appId, 'public', 'data', 'participants');
    const snapshot = await getDocs(dataCol);
    return snapshot.docs.map(d => d.data());
}

export function listenToCheckins(callback) {
    const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
    const q = query(checkinsRef, orderBy('checkedInAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const checkins = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(checkins);
    }, (error) => console.error('Check-in listener error:', error));
}

export async function checkParticipantStatus(phone) {
    const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
    const q = query(checkinsRef, where('phone', '==', phone));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

export async function batchDeleteAll(collectionName) {
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

export async function batchUploadParticipants(newData) {
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

```

## File: js/ui.js
```javascript
import { getStats, sanitizePhoneNumber } from './utils.js';

export function showView(id) {
    ['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });
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
    if (title) title.textContent = '?곌껐 ?ㅻ쪟';
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

    if (nameEl) nameEl.textContent = user.name || user.?대쫫 || inputName;
    if (deptEl) deptEl.textContent = user.department || user.遺??|| '';
    if (activityEl) activityEl.textContent = user.activity_name || user.?≫떚鍮꾪떚 || user.bus || '-';
    if (timeEl) timeEl.textContent = user.start_time || user.異쒕컻?쒓컙 || '-';
    if (locEl) locEl.textContent = user.meeting_point || user.吏묓빀?μ냼 || '-';
    if (guideEl) guideEl.textContent = user.guide_info || user['媛?대뱶 ?뺣낫'] || '-';

    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) {
        const schedules = [user.schedule_1 || user['?쇱젙 1'], user.schedule_2 || user['?쇱젙 2'], user.schedule_3 || user['?쇱젙 3']].filter(s => s && s.trim());
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
    }

    const supplies = user.supplies || user.以鍮꾨Ъ;
    const notice = user.notice || user.二쇱쓽?ы빆;
    const noticeBox = document.getElementById('notice-box');
    if (noticeBox) {
        if (supplies || notice) {
            noticeBox.classList.remove('hidden');
            const sEl = noticeBox.querySelector('#notice-supplies');
            const wEl = noticeBox.querySelector('#notice-warning');
            if (sEl) {
                sEl.style.display = supplies ? 'flex' : 'none';
                sEl.querySelector('span').textContent = supplies || '';
            }
            if (wEl) {
                wEl.style.display = notice ? 'flex' : 'none';
                wEl.querySelector('span').textContent = notice || '';
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
    const checkedPhones = new Set();
    checkins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedPhones.add(sPhone);
    });

    let validCheckedCount = 0;
    participants.forEach(p => {
        const sPhone = sanitizePhoneNumber(p.phone || p.?대??꾪솕 || '');
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
            const name = (p.name || p.?대쫫 || '').toLowerCase();
            const phone = (p.phone || p.?대??꾪솕 || '');
            return name.includes(searchVal) || phone.includes(searchVal);
        })
        .map(p => {
            const sPhone = sanitizePhoneNumber(p.phone || p.?대??꾪솕 || '');
            return { ...p, sPhone, isChecked: checkedMap.has(sPhone) };
        });

    displayData.sort((a, b) => {
        if (sortMode === 'status') {
            if (a.isChecked === b.isChecked) return (a.name || a.?대쫫 || '').localeCompare(b.name || b.?대쫫 || '');
            return a.isChecked ? 1 : -1;
        } else if (sortMode === 'course') {
            const courseA = (a.activity_name || a.?≫떚鍮꾪떚 || a.bus || '').toLowerCase();
            const courseB = (b.activity_name || b.?≫떚鍮꾪떚 || b.bus || '').toLowerCase();
            if (courseA === courseB) {
                return (a.name || a.?대쫫 || '').localeCompare(b.name || b.?대쫫 || '');
            }
            return courseA.localeCompare(courseB);
        }
        return (a.name || a.?대쫫 || '').localeCompare(b.name || b.?대쫫 || '');
    });

    if (displayData.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 text-center py-8 text-[10px]">No results found</p>';
        return;
    }

    listEl.innerHTML = displayData.map(p => {
        return `<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl px-4 py-2 group hover:border-[#00A97A]/30 transition-soft">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full ${p.isChecked ? 'bg-[#00A97A]' : 'bg-slate-200'}"></div>
                        <span class="font-black text-slate-900 text-[11px]">${p.name || p.?대쫫}</span>
                        <span class="text-[8px] text-slate-300 font-bold uppercase tracking-widest">${p.department || '-'}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[#9E2AB5] font-black text-[8px] uppercase tracking-widest bg-[#9E2AB5]/5 px-1.5 py-0.5 rounded-md">${(p.activity_name || p.?≫떚鍮꾪떚 || p.bus || '').split(':')[0]}</span>
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

```

## File: js/utils.js
```javascript
export function sanitizePhoneNumber(input) {
    if (!input) return '';
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('82')) digits = digits.substring(2);
    if (digits.startsWith('010')) digits = digits.substring(1);
    return digits;
}

export function parseCSVLine(text) {
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

export function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function getStats(participants, checkins) {
    const stats = {};
    const checkedMap = new Map();
    checkins.forEach(c => {
        const sPhone = sanitizePhoneNumber(c.phone || '');
        if (sPhone) checkedMap.set(sPhone, true);
    });

    participants.forEach(p => {
        let activity = p.activity_name || p.?≫떚鍮꾪떚 || p.bus || 'Unknown';
        if (activity.includes(':')) activity = activity.split(':')[0].trim();

        if (!stats[activity]) stats[activity] = { total: 0, checked: 0 };
        stats[activity].total++;
        const sPhone = sanitizePhoneNumber(p.phone || p.?대??꾪솕 || '');
        if (checkedMap.has(sPhone)) stats[activity].checked++;
    });
    return stats;
}

// Helper to loosely match headers
export function getSafeHeader(row, possibleHeaders) {
    // defined headers we want
    for (const h of possibleHeaders) {
        // check actual keys in the row
        for (const key of Object.keys(row)) {
            // remove spaces and lowercase for comparison
            if (key.replace(/\s/g, '').toLowerCase() === h.replace(/\s/g, '').toLowerCase()) {
                return row[key];
            }
        }
    }
    return '';
}

```
