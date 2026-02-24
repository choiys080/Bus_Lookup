import { db, appId } from './config.js';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { chunkArray } from './utils.js';

const BATCH_SIZE = 100;

export async function fetchParticipants() {
    const dataCol = collection(db, 'artifacts', appId, 'public', 'data', 'participants');
    const snapshot = await getDocs(dataCol);
    return snapshot.docs.map(d => d.data());
}

export async function fetchMetadata() {
    const metaRef = doc(db, 'artifacts', appId, 'public', 'data', 'metadata', 'config');
    const snap = await getDoc(metaRef);
    return snap.exists() ? snap.data() : null;
}

export async function updateMetadata(data) {
    const metaRef = doc(db, 'artifacts', appId, 'public', 'data', 'metadata', 'config');
    await setDoc(metaRef, data, { merge: true });
}

export function listenToCheckins(callback) {
    const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
    const q = query(checkinsRef); // Remove orderBy to ensure all docs are captured regardless of fields
    return onSnapshot(q, (snapshot) => {
        const checkins = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(checkins);
    }, (error) => console.error('Check-in listener error:', error));
}

export async function checkParticipantStatus(phone, name) {
    const checkinsRef = collection(db, 'artifacts', appId, 'public', 'data', 'checkins');
    let q;
    if (phone) {
        q = query(checkinsRef, where('phone', '==', phone));
    } else if (name) {
        q = query(checkinsRef, where('name', '==', name));
    } else {
        return false;
    }
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

export async function batchUploadParticipants(newData, onProgress) {
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'participants');

    // 1. Delete ALL existing records FIRST to avoid orphan entries
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
        if (onProgress) onProgress(0, 'Clearing existing data...');
        const deleteChunks = chunkArray(snapshot.docs, BATCH_SIZE);
        for (const chunk of deleteChunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    }

    // 2. Upload NEW data
    const chunks = chunkArray(newData, BATCH_SIZE);
    let globalIndex = 0;
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = writeBatch(db);
        chunk.forEach(p => {
            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'participants', `p_${globalIndex++}`);
            batch.set(ref, p);
        });
        await batch.commit();
        if (onProgress) onProgress(Math.round(((i + 1) / chunks.length) * 100), 'Syncing...');
    }
}
