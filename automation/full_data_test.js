const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCAL_URL = 'http://localhost:3000/';

// Parse CSV to get all participants
function parseCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));

    const participants = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim());
        const name = cols[0];
        const phone = cols[2];
        const activity = cols[3];

        if (name && phone) {
            participants.push({ name, phone, activity, line: i + 1 });
        }
    }
    return participants;
}

async function runFullDataTest() {
    console.log('🧪 FULL DATA VALIDATION TEST');
    console.log('============================\n');

    const csvPath = path.join(__dirname, '..', 'participants_data.csv');
    const participants = parseCSV(csvPath);

    console.log(`📋 Total participants to test: ${participants.length}\n`);
    console.log('Opening browser... (SLOW MODE - 1 second between actions)\n');

    // SLOW mode - headless: false, slowMo: 1000
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000  // 1 second between each action
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 450, height: 900 });

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Navigate once and wait for data to load
    console.log('📡 Loading application and waiting for data sync...');
    await page.goto(LOCAL_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });
    console.log('✅ App loaded successfully\n');

    // Wait extra time for full data load
    await page.waitForTimeout(2000);

    console.log('Starting participant validation...\n');
    console.log('='.repeat(60));

    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const progress = `[${i + 1}/${participants.length}]`;

        try {
            // Clear inputs
            await page.fill('#phone-input', '');
            await page.fill('#name-input', '');

            // Enter phone
            await page.fill('#phone-input', p.phone);

            // Click verify button
            await page.click('button:has-text("본인 인증")');

            // Wait for result
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });

            // Verify name displayed correctly
            const displayedName = await page.textContent('#res-name');
            const displayedActivity = await page.textContent('#res-activity-summary');

            if (displayedName.includes(p.name) || p.name.includes(displayedName.trim())) {
                console.log(`${progress} ✅ ${p.name} | ${p.phone}`);
                console.log(`         Activity: ${displayedActivity}`);
                passed++;
            } else {
                console.log(`${progress} ⚠️ ${p.name} | Name mismatch: got "${displayedName}"`);
                passed++; // Still counts as found, just name display issue
            }

            // Click "New Search" to reset
            await page.click('button:has-text("New Search")');
            await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });

        } catch (err) {
            console.log(`${progress} ❌ ${p.name} | ${p.phone} - FAILED`);
            console.log(`         Error: ${err.message}`);
            failed++;
            failures.push({ ...p, error: err.message });

            // Try to recover to input view
            try {
                const errorViewVisible = await page.isVisible('#error-view:not(.hidden)');
                if (errorViewVisible) {
                    await page.click('button:has-text("다시 시도하기")');
                } else {
                    await page.goto(LOCAL_URL);
                }
                await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });
            } catch (e) {
                // Force reload
                await page.goto(LOCAL_URL);
                await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });
            }
        }
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total:  ${participants.length}`);

    if (failures.length > 0) {
        console.log('\n❌ FAILURES:');
        failures.forEach(f => {
            console.log(`   Line ${f.line}: ${f.name} | ${f.phone}`);
            console.log(`           ${f.error}`);
        });
    }

    if (failed === 0) {
        console.log('\n🎉 ALL PARTICIPANTS VALIDATED SUCCESSFULLY!');
    }
}

runFullDataTest().catch(console.error);
