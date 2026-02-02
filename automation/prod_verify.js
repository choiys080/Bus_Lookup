const { chromium } = require('playwright');

const LIVE_URL = 'https://prismatic-salamander-40f491.netlify.app/';

async function verifyProduction() {
    console.log('🚀 Production Verification\n');
    console.log(`Target: ${LIVE_URL}\n`);

    const browser = await chromium.launch({ headless: false, slowMo: 300 }); // Visible browser with slowMo for watching
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    let passed = 0;
    let failed = 0;

    // Test 1: Page loads
    try {
        console.log('⏳ Page loads...');
        await page.goto(LIVE_URL);
        await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });
        console.log('✅ Page loads PASSED');
        passed++;
    } catch (e) {
        console.log('❌ Page loads FAILED:', e.message);
        failed++;
    }

    // Test 2: Valid lookup
    try {
        console.log('⏳ Valid lookup (홍길동)...');
        await page.fill('#phone-input', '01012345678');
        await page.click('button:has-text("본인 인증")');
        await page.waitForSelector('#result-view:not(.hidden)', { timeout: 10000 });
        const name = await page.textContent('#res-name');
        if (name.includes('홍길동')) {
            console.log('✅ Valid lookup PASSED');
            passed++;
        } else {
            throw new Error(`Name mismatch: ${name}`);
        }
    } catch (e) {
        console.log('❌ Valid lookup FAILED:', e.message);
        failed++;
    }

    // Test 3: Reset and invalid lookup
    try {
        console.log('⏳ Invalid lookup...');
        await page.click('button:has-text("New Search")');
        await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });
        await page.fill('#phone-input', '00000000000');
        await page.click('button:has-text("본인 인증")');
        await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
        console.log('✅ Invalid lookup PASSED');
        passed++;
    } catch (e) {
        console.log('❌ Invalid lookup FAILED:', e.message);
        failed++;
    }

    // Take final screenshot
    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\prod_verification.png' });

    await browser.close();

    console.log('\n========================================');
    console.log(`📊 Production Results: ${passed}/3 passed`);
    console.log('========================================');

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('\n✅ PRODUCTION DEPLOYMENT VERIFIED!');
    }
}

verifyProduction();
