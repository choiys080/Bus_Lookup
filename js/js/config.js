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
