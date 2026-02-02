const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

async function testCheckinDeduplication() {
    console.log('🧪 CHECK-IN DEDUPLICATION TEST');
    console.log('===============================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 800  // Slower for visibility
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 450, height: 900 });

    console.log('1. Loading app...');
    await page.goto(LOCAL_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });
    console.log('   ✅ App loaded\n');

    // First, go to admin and clear all check-ins
    console.log('2. Clearing all existing check-ins...');
    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });

    // Accept confirmation dialog
    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(2000);
    console.log('   ✅ Check-ins cleared\n');

    // Get initial count
    const initialCount = await page.textContent('#admin-checked-count');
    console.log(`3. Initial check-in count: ${initialCount}\n`);

    // Exit admin
    await page.click('button:has-text("EXIT")');
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });

    // Test user check-in
    const testPhone = '01012345678';
    const testName = '홍길동';

    console.log('4. First check-in attempt for:', testName);
    await page.fill('#phone-input', testPhone);
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
    console.log('   ✅ Lookup successful\n');

    // Go back and check-in again (same person)
    await page.click('button:has-text("New Search")');
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });

    console.log('5. Second check-in attempt (SAME person)...');
    await page.fill('#phone-input', testPhone);
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
    console.log('   ✅ Lookup successful\n');

    // Go back and check-in THIRD time
    await page.click('button:has-text("New Search")');
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });

    console.log('6. Third check-in attempt (SAME person)...');
    await page.fill('#phone-input', testPhone);
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
    console.log('   ✅ Lookup successful\n');

    // Now check admin to see if count is 1 (not 3)
    console.log('7. Checking admin dashboard...');
    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });

    await page.waitForTimeout(1500);
    const finalCount = await page.textContent('#admin-checked-count');
    console.log(`\n📊 FINAL CHECK-IN COUNT: ${finalCount}`);

    if (finalCount === '1') {
        console.log('\n✅ DEDUPLICATION WORKING! Same person only counted once.');
    } else {
        console.log(`\n❌ DEDUPLICATION FAILED! Expected 1, got ${finalCount}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\checkin_dedup_test.png' });

    await browser.close();
}

testCheckinDeduplication().catch(console.error);
