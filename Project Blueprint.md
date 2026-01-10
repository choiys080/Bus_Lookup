# **Project Blueprint: Cloud-Synced Bus Lookup System**

This document contains the final technical architecture and operational guide for the Bus Information Lookup system.

## **1\. Project Overview**

The objective is a "Self-Service Lookup Portal" where participants scan a static QR code, verify their identity via Name and Phone Number, and receive their specific "Slide 3" bus assignment. The data is managed by the client via a hidden CSV upload interface that syncs to a global Firestore database.

## **2\. Data Preparation (The CSV Template)**

Provide this exact template to the requester. Remind them that any deviation in column headers will break the lookup logic.

| Name | Phone | Affiliation | Bus\_Assignment | Departure\_Time |
| :---- | :---- | :---- | :---- | :---- |
| John Doe | 01012345678 | B. Braun | Bus A \- Gate 1 | 09:00 AM |
| Jane Smith | 01099998888 | Pfizer | Bus C \- Gate 3 | 09:15 AM |

**Rules:**

1. **Phone Numbers:** Use digits only (no dashes) for the most reliable lookup.  
2. **Export:** The file must be saved as **.csv (Comma Separated Values)**.

## **3\. The Master Source Code**

This is a single-file solution using Tailwind CSS, Lucide Icons, and Firebase Firestore.  
\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>Event Participant Lookup\</title\>  
    \<script src="\[https://cdn.tailwindcss.com\](https://cdn.tailwindcss.com)"\>\</script\>  
    \<script src="\[https://unpkg.com/lucide@latest\](https://unpkg.com/lucide@latest)"\>\</script\>  
    \<style\>  
        @import url('\[https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800\&display=swap\](https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800\&display=swap)');  
        body { font-family: 'Inter', sans-serif; }  
        .slide-in { animation: slideIn 0.4s ease-out forwards; }  
        @keyframes slideIn {  
            from { opacity: 0; transform: translateY(20px); }  
            to { opacity: 1; transform: translateY(0); }  
        }  
    \</style\>  
\</head\>  
\<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4"\>  
    \<div id="app" class="w-full max-w-md bg-white rounded-\[2.5rem\] shadow-2xl overflow-hidden border border-slate-200"\>  
        \<div class="bg-\[\#007A33\] p-8 text-white relative"\>  
            \<div class="flex justify-between items-center"\>  
                \<div\>  
                    \<h1 class="text-2xl font-bold tracking-tight"\>Event Portal\</h1\>  
                    \<p class="text-emerald-100 opacity-80 text-sm"\>Cloud-Synced Logistics\</p\>  
                \</div\>  
                \<i data-lucide="bus" class="w-10 h-10 opacity-50"\>\</i\>  
            \</div\>  
        \</div\>  
        \<div class="p-8" id="content-area"\>  
            \<div id="loading-view" class="flex flex-col items-center justify-center py-12 space-y-4"\>  
                \<div class="w-12 h-12 border-4 border-\[\#007A33\] border-t-transparent rounded-full animate-spin"\>\</div\>  
                \<p class="text-slate-400 font-medium text-sm"\>Syncing with cloud...\</p\>  
            \</div\>  
            \<div id="admin-view" class="hidden slide-in space-y-6"\>  
                \<div class="text-center"\>\<h2 class="text-xl font-bold text-slate-800"\>Admin Upload\</h2\>\</div\>  
                \<div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:border-\[\#007A33\] cursor-pointer" id="drop-zone"\>  
                    \<i data-lucide="upload-cloud" class="w-10 h-10 mx-auto text-slate-400 mb-2"\>\</i\>  
                    \<p class="text-xs text-slate-500"\>Click to upload Participant CSV\</p\>  
                    \<input type="file" id="csv-upload" accept=".csv" class="hidden"\>  
                \</div\>  
                \<div id="upload-msg" class="text-center text-xs font-bold uppercase tracking-widest"\>\</div\>  
                \<button onclick="toggleAdmin()" class="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm"\>Exit Admin Mode\</button\>  
            \</div\>  
            \<div id="input-view" class="hidden space-y-6"\>  
                \<div class="text-center space-y-2"\>  
                    \<h2 class="text-2xl font-extrabold text-slate-800"\>Welcome\</h2\>  
                    \<p class="text-slate-500"\>Enter your info to see your assignment.\</p\>  
                \</div\>  
                \<div class="space-y-4"\>  
                    \<div class="space-y-1"\>  
                        \<label class="text-\[10px\] font-bold uppercase tracking-\[0.2em\] text-slate-400"\>Full Name\</label\>  
                        \<div class="relative"\>  
                            \<i data-lucide="user" class="absolute left-4 top-1/2 \-translate-y-1/2 w-5 h-5 text-slate-400"\>\</i\>  
                            \<input type="text" id="name-input" class="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"\>  
                        \</div\>  
                    \</div\>  
                    \<div class="space-y-1"\>  
                        \<label class="text-\[10px\] font-bold uppercase tracking-\[0.2em\] text-slate-400"\>Phone Number\</label\>  
                        \<div class="relative"\>  
                            \<i data-lucide="phone" class="absolute left-4 top-1/2 \-translate-y-1/2 w-5 h-5 text-slate-400"\>\</i\>  
                            \<input type="tel" id="phone-input" class="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"\>  
                        \</div\>  
                    \</div\>  
                    \<button onclick="handleLookup()" class="w-full bg-\[\#007A33\] text-white font-bold py-5 rounded-2xl shadow-lg"\>Find My Bus\</button\>  
                \</div\>  
            \</div\>  
            \<div id="result-view" class="hidden slide-in space-y-8"\>  
                \<div class="flex flex-col items-center text-center"\>  
                    \<div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-\[\#007A33\] mb-4"\>\<i data-lucide="check-circle-2"\>\</i\>\</div\>  
                    \<h2 class="text-3xl font-black text-slate-800"\>Confirmed\!\</h2\>  
                    \<p class="text-slate-500"\>Welcome, \<span id="res-name" class="font-bold text-slate-800 underline decoration-\[\#007A33\]"\>User\</span\>\</p\>  
                \</div\>  
                \<div class="bg-slate-50 border-2 border-\[\#007A33\] rounded-\[2rem\] p-8 space-y-6"\>  
                    \<div class="flex justify-between items-start border-b border-slate-200 pb-4"\>  
                        \<div\>\<p class="text-\[10px\] uppercase"\>Affiliation\</p\>\<p id="res-aff" class="text-lg font-bold text-slate-700"\>-\</p\>\</div\>  
                        \<div class="text-right"\>\<p class="text-\[10px\] uppercase"\>Departure\</p\>\<p id="res-time" class="text-lg font-bold text-slate-700"\>-\</p\>\</div\>  
                    \</div\>  
                    \<div\>\<p class="text-\[10px\] uppercase mb-1"\>Bus Assignment\</p\>\<div id="res-bus" class="text-4xl font-black text-\[\#007A33\]"\>TBD\</div\>\</div\>  
                \</div\>  
                \<button onclick="resetApp()" class="w-full py-2 text-slate-400 font-bold text-sm"\>New Search\</button\>  
            \</div\>  
            \<div id="error-view" class="hidden slide-in text-center space-y-6"\>  
                \<i data-lucide="alert-circle" class="w-10 h-10 mx-auto text-rose-500"\>\</i\>  
                \<h2 class="text-2xl font-extrabold text-slate-800"\>No Record Found\</h2\>  
                \<button onclick="resetApp()" class="w-full bg-slate-800 text-white font-bold py-5 rounded-2xl"\>Try Again\</button\>  
            \</div\>  
        \</div\>  
        \<div class="bg-slate-50 border-t border-slate-100 py-6 text-center cursor-default" ondblclick="toggleAdmin()"\>  
            \<p class="text-\[9px\] text-slate-300 uppercase tracking-\[0.3em\] font-black"\>Secure Cloud Portal v4.1\</p\>  
        \</div\>  
    \</div\>  
    \<script type="module"\>  
        import { initializeApp } from "\[https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js\](https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js)";  
        import { getAuth, signInAnonymously, onAuthStateChanged } from "\[https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js\](https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js)";  
        import { getFirestore, collection, doc, setDoc, getDocs, writeBatch } from "\[https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js\](https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js)";

        const firebaseConfig \= JSON.parse(\_\_firebase\_config);  
        const app \= initializeApp(firebaseConfig);  
        const auth \= getAuth(app);  
        const db \= getFirestore(app);  
        const appId \= typeof \_\_app\_id \!== 'undefined' ? \_\_app\_id : 'default-app-id';

        let PARTICIPANTS \= \[\];  
        let currentUser \= null;

        onAuthStateChanged(auth, async (user) \=\> {  
            if (user) {  
                currentUser \= user;  
                await loadGlobalData();  
                showView('input-view');  
            } else {  
                await signInAnonymously(auth);  
            }  
        });

        async function loadGlobalData() {  
            if (\!currentUser) return;  
            const dataCol \= collection(db, 'artifacts', appId, 'public', 'data', 'participants');  
            const snapshot \= await getDocs(dataCol);  
            PARTICIPANTS \= snapshot.docs.map(d \=\> d.data());  
        }

        window.showView \= (id) \=\> {  
            \['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view'\].forEach(v \=\> document.getElementById(v).classList.add('hidden'));  
            document.getElementById(id).classList.remove('hidden');  
        };

        window.toggleAdmin \= () \=\> {  
            const adminView \= document.getElementById('admin-view');  
            adminView.classList.contains('hidden') ? showView('admin-view') : showView('input-view');  
        };

        window.handleLookup \= () \=\> {  
            const name \= document.getElementById('name-input').value.trim().toLowerCase();  
            const phone \= document.getElementById('phone-input').value.replace(/\\D/g, '');  
            const user \= PARTICIPANTS.find(u \=\> u.name.toLowerCase() \=== name && u.phone.replace(/\\D/g, '') \=== phone);  
            if (user) {  
                document.getElementById('res-name').textContent \= user.name;  
                document.getElementById('res-aff').textContent \= user.aff;  
                document.getElementById('res-bus').textContent \= user.bus;  
                document.getElementById('res-time').textContent \= user.time;  
                showView('result-view');  
            } else {  
                showView('error-view');  
            }  
        };

        document.getElementById('drop-zone').onclick \= () \=\> document.getElementById('csv-upload').click();  
        document.getElementById('csv-upload').onchange \= async (e) \=\> {  
            const file \= e.target.files\[0\];  
            const reader \= new FileReader();  
            reader.onload \= async (event) \=\> {  
                const rows \= event.target.result.split('\\n').slice(1);  
                const newData \= rows.map(row \=\> {  
                    const cols \= row.split(',');  
                    return cols.length \< 4 ? null : { name: cols\[0\].trim(), phone: cols\[1\].trim(), aff: cols\[2\].trim(), bus: cols\[3\].trim(), time: cols\[4\]?.trim() || '09:00 AM' };  
                }).filter(u \=\> u \!== null);  
                if (newData.length \> 0\) {  
                    const batch \= writeBatch(db);  
                    newData.forEach((p, idx) \=\> {  
                        const ref \= doc(db, 'artifacts', appId, 'public', 'data', 'participants', \`p\_${idx}\`);  
                        batch.set(ref, p);  
                    });  
                    await batch.commit();  
                    await loadGlobalData();  
                    alert("Cloud Synced\!");  
                    toggleAdmin();  
                }  
            };  
            reader.readAsText(file);  
        };  
        lucide.createIcons();  
    \</script\>  
\</body\>  
\</html\>

## **4\. Deployment Instructions**

1. **GitHub Repository:** Create a new repository named bus-lookup.  
2. **Push Code:** Initialize git in your local folder, add the index.html, and push to GitHub.  
3. **GitHub Pages:** In settings, enable Pages from the main branch.  
4. **QR Code:** Use the resulting URL (youruser.github.io/bus-lookup) to generate the static QR code for the posters.

## **5\. Client Handover Guide**

Instruct the client to do the following on event day:

1. **Open the App:** Navigate to the live URL.  
2. **Access Admin:** Double-click the footer text ("Secure Cloud Portal v4.1").  
3. **Upload Data:** Drag and drop the final Participant CSV.  
4. **Confirmation:** Once they see "Cloud Synced\!", the app is live for all users globally.