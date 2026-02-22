import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Load dynamic config from localStorage if available
const savedConfig = localStorage.getItem('FIREBASE_CONFIG');
const savedAppId = localStorage.getItem('APP_ID');

// --- TEMPORARY TESTING CONFIGURATION (REMOVE BEFORE HANDOFF) ---
const testingConfig = {
    apiKey: "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I",
    authDomain: "buslookup-5fd0d.firebaseapp.com",
    projectId: "buslookup-5fd0d",
    storageBucket: "buslookup-5fd0d.firebasestorage.app",
    messagingSenderId: "981605729788",
    appId: "1:981605729788:web:942a2188f3985433659e79",
    measurementId: "G-SXL79P93YD"
};
// ----------------------------------------------------------------

const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : (
    typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : testingConfig
);

export const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

// Only initialize if we have a real config
export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

if (auth) {
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence failed", err));
}

export const db = app ? getFirestore(app) : null;
export const appId = savedAppId || 'annual-kickoff-2026'; // Testing Default
