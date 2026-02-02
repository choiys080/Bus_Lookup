const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

async function testActivityDisplay() {
    console.log('🧪 ACTIVITY DISPLAY TEST');
    console.log('========================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 800
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 450, height: 900 });

    // Accept dialogs
    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    console.log('1. Loading app...');
    await page.goto(LOCAL_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });
    console.log('   ✅ App loaded\n');

    // Go to admin and clear check-ins first
    console.log('2. Clearing existing check-ins...');
    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("EXIT")');
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });
    console.log('   ✅ Cleared\n');

    // Check in a few different people with different activities
    const testUsers = [
        { phone: '01039203540', name: '임석준', expected: 'E코스: 레이싱 & 칠링' },
        { phone: '01073316309', name: '조세림', expected: 'A코스: 한라산 챌린저' },
        { phone: '01037477172', name: '곽준우', expected: 'G코스: 오션 헌터' },
    ];

    for (const user of testUsers) {
        console.log(`3. Checking in: ${user.name}...`);
        await page.fill('#phone-input', user.phone);
        await page.click('button:has-text("본인 인증")');
        await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });

        const activity = await page.textContent('#res-activity-summary');
        console.log(`   Activity displayed: ${activity}`);

        await page.click('button:has-text("New Search")');
        await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });
    }

    // Now check admin to see activities
    console.log('\n4. Checking admin dashboard...');
    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Get check-in log content
    const logContent = await page.textContent('#checkin-log');
    console.log('\n📋 CHECK-IN LOG CONTENT:');
    console.log(logContent);

    // Take screenshot
    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\activity_display_test.png' });
    console.log('\n📸 Screenshot saved to activity_display_test.png');

    await browser.close();
}

testActivityDisplay().catch(console.error);
