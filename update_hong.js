const https = require('https');

const API_KEY = "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I";
const PROJECT_ID = "buslookup-5fd0d";
const APP_ID = "default-app-id";
const USER_NAME = "홍길동";
const NEW_PHONE = "01012345678";

function request(url, method, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    console.log("Raw response:", data);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    try {
        console.log("1. Authenticating...");
        const authData = await request(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
            'POST',
            { returnSecureToken: true }
        );
        const token = authData.idToken;
        if (!token) throw new Error("Authentication failed: " + JSON.stringify(authData));
        console.log("Authenticated.");

        console.log("2. Searching for user...");
        const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/${APP_ID}/public/data/participants`;

        const listData = await request(listUrl, 'GET', null, { Authorization: `Bearer ${token}` });

        if (!listData.documents) {
            console.log("No documents found in collection.");
            return;
        }

        let found = false;
        for (const doc of listData.documents) {
            const fields = doc.fields;
            const name = fields.name?.stringValue || fields.이름?.stringValue;

            if (name === USER_NAME) {
                console.log(`Found user: ${name} at ${doc.name}`);
                found = true;

                console.log("3. Updating phone number directly via REST...");
                const docPath = doc.name.split('/documents/')[1]; // Remove prefix if full path is returned
                // Actually the doc.name IS the full path usually "projects/.../documents/..."
                // The REST API expects the full resource name in the URL
                const patchUrl = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=phone`;

                const patchData = await request(
                    patchUrl,
                    'PATCH',
                    { fields: { phone: { stringValue: NEW_PHONE } } },
                    { Authorization: `Bearer ${token}` }
                );

                console.log("Update Response:", JSON.stringify(patchData, null, 2));
                console.log(`SUCCESS: Phone updated to ${NEW_PHONE}`);
                break;
            }
        }

        if (!found) console.log(`User ${USER_NAME} not found.`);

    } catch (e) {
        console.error("Error:", e);
    }
})();
