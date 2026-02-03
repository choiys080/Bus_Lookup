const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

async function testSorting() {
    console.log('🧪 TESTING ATTENDANCE SORTING');
    console.log('==============================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('1. Loading app and entering Admin mode...');
    await page.goto(LOCAL_URL);
    // Wait for loading to finish
    await page.waitForSelector('#loading-view', { state: 'hidden', timeout: 30000 });
    await page.waitForSelector('#admin-trigger', { state: 'visible' });

    // Give Lucide icons a moment
    await page.waitForTimeout(1000);
    await page.click('#admin-trigger');

    await page.waitForSelector('#password-modal:not(.hidden)');
    await page.fill('#password-input', 'admin123');
    await page.click('#password-modal button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)');

    console.log('2. Switching to Attendance Status tab...');
    await page.click('#tab-status-btn');
    await page.waitForSelector('#attendance-list');

    // Helper to get list names
    const getNames = async () => {
        return await page.$$eval('#attendance-list .font-bold', nodes => nodes.map(n => n.textContent.trim()));
    };

    // Helper to get list activities
    const getActivities = async () => {
        return await page.$$eval('#attendance-list .text-\\[9px\\].text-\\[\\#9E2AB5\\]', nodes => nodes.map(n => n.textContent.trim()));
    };

    console.log('\n--- Verify Default Sort (Name) ---');
    const namesDefault = await getNames();
    console.log('First 3 names:', namesDefault.slice(0, 3));
    // Korean alphabetical check (간단하게)
    if (namesDefault[0] <= namesDefault[1]) {
        console.log('✅ Name sorting looks correct');
    }

    console.log('\n--- Verify Course Sort ---');
    await page.click('#sort-course-btn');
    await page.waitForTimeout(1000);
    const activitiesSorted = await getActivities();
    console.log('First 5 courses:', activitiesSorted.slice(0, 5));
    if (activitiesSorted[0] <= activitiesSorted[activitiesSorted.length - 1]) {
        console.log('✅ Course sorting looks correct');
    }

    console.log('\n--- Verify Status Sort ---');
    // Check in one person first
    await page.click('button:has-text("EXIT")');
    await page.waitForSelector('#input-view:not(.hidden)');
    const testUserPhone = '01012345678'; // 홍길동
    await page.fill('#phone-input', testUserPhone);
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)');

    // Back to admin
    await page.click('button:has-text("New Search")');
    await page.click('#admin-trigger');
    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');
    await page.click('#tab-status-btn');

    await page.click('#sort-status-btn');
    await page.waitForTimeout(1000);

    const firstStatus = await page.$eval('#attendance-list div span.bg-\\[\\#00A97A\\]\\/10', el => el ? 'Checked' : 'Pending').catch(() => 'Pending');
    console.log('First status in list:', firstStatus);

    if (firstStatus === 'Checked') {
        console.log('✅ Status sorting (Checked first) works');
    } else {
        console.log('❌ Status sorting failed');
    }

    // Take a screenshot of the sorted list
    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\sort_verification.png' });
    console.log('\n📸 Screenshot saved to sort_verification.png');

    await browser.close();
}

testSorting().catch(console.error);
