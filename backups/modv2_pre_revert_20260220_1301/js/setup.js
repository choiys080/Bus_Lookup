import { showView } from './ui.js';

export function initSetup() {
    const saveBtn = document.getElementById('save-setup-btn');
    const snippetInput = document.getElementById('setup-snippet');
    const appIdInput = document.getElementById('setup-app-id');
    const errorEl = document.getElementById('setup-error');
    const helpToggle = document.getElementById('setup-help-toggle');
    const guideEl = document.getElementById('setup-guide');

    if (!saveBtn) return;

    // Prevent duplicate listeners
    if (saveBtn.dataset.listenerAttached) return;
    saveBtn.dataset.listenerAttached = 'true';

    if (helpToggle && guideEl) {
        helpToggle.addEventListener('click', () => {
            guideEl.classList.toggle('hidden');
        });
    }

    // Pre-fill if exists
    const existingConfig = localStorage.getItem('FIREBASE_CONFIG');
    const existingAppId = localStorage.getItem('APP_ID');
    if (existingConfig && snippetInput) snippetInput.value = existingConfig;
    if (existingAppId && appIdInput) appIdInput.value = existingAppId;

    saveBtn.addEventListener('click', () => {
        try {
            const snippet = snippetInput.value.trim();
            const appId = appIdInput.value.trim();

            if (!snippet) throw new Error("Please paste your Firebase SDK snippet.");
            if (!appId) throw new Error("Please enter an Event Identifier.");

            // Basic parsing to find the config object
            let config = null;

            // Try to extract object-like content { ... }
            const match = snippet.match(/\{[\s\S]*\}/);
            if (match) {
                let rawObj = match[0];

                let cleanSnippet = rawObj
                    .replace(/(\/\/.*)/g, '')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/([a-zA-Z0-9_]+):/g, '"$1":')
                    .replace(/'/g, '"')
                    .replace(/,(\s*[\}\]])/g, '$1')
                    .replace(/\s+/g, ' ');

                try {
                    config = JSON.parse(cleanSnippet);
                } catch (e) {
                    console.error("JSON Parse failed:", e, "Snippet:", cleanSnippet);
                    throw new Error("Invalid format. Please copy the entire { ... } block.");
                }
            } else {
                throw new Error("No configuration found.");
            }

            if (!config.apiKey || !config.projectId || !config.appId) {
                throw new Error("Invalid Snippet: Missing core fields.");
            }

            localStorage.setItem('FIREBASE_CONFIG', JSON.stringify(config));
            localStorage.setItem('APP_ID', appId);
            window.location.reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        }
    });
}
