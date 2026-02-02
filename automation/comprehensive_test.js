const { chromium } = require('playwright');

const LIVE_URL = 'https://prismatic-salamander-40f491.netlify.app/';
const LOCAL_URL = 'http://localhost:3000/';
const TEST_URL = LOCAL_URL; // Test locally first

const TESTS = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
    TESTS.push({ name, fn });
}

async function runTests() {
    console.log('🧪 Starting Comprehensive Test Suite...\n');
    console.log(`Target: ${TEST_URL}\n`);

    const browser = await chromium.launch({ headless: true });

    for (const t of TESTS) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setViewportSize({ width: 390, height: 844 });

        try {
            console.log(`⏳ ${t.name}...`);
            await t.fn(page);
            console.log(`✅ ${t.name} PASSED`);
            passed++;
        } catch (err) {
            console.log(`❌ ${t.name} FAILED: ${err.message}`);
            failed++;
        } finally {
            await context.close();
        }
    }

    await browser.close();

    console.log('\n========================================');
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    if (failed > 0) {
        process.exit(1);
    }
}

// ============================================
// TEST CASES
// ============================================

test('Page loads and shows input view', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });
});

test('Valid phone lookup succeeds (홍길동)', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.fill('#name-input', '홍길동');
    await page.fill('#phone-input', '01012345678');
    await page.click('button:has-text("본인 인증")');

    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 5000 });

    const nameText = await page.textContent('#res-name');
    if (!nameText.includes('홍길동')) {
        throw new Error(`Expected name to include 홍길동, got: ${nameText}`);
    }
});

test('Invalid phone lookup shows error view', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.fill('#name-input', 'Invalid User');
    await page.fill('#phone-input', '00000000000');
    await page.click('button:has-text("본인 인증")');

    await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
});

test('Empty phone shows alert', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    // Set up dialog handler before clicking
    let alertShown = false;
    page.on('dialog', async dialog => {
        alertShown = true;
        await dialog.accept();
    });

    await page.fill('#name-input', 'Test');
    // Leave phone empty
    await page.click('button:has-text("본인 인증")');

    await page.waitForTimeout(500);
    if (!alertShown) {
        throw new Error('Expected alert for empty phone');
    }
});

test('Admin access requires password', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    // Click admin trigger (settings icon)
    await page.click('#admin-trigger');

    // Password modal should appear
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
});

test('Admin login with correct password', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });

    await page.fill('#password-input', 'admin123');
    await page.click('button:has-text("Enter")');

    await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });
});

test('Admin login with wrong password fails', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });

    await page.fill('#password-input', 'wrongpassword');
    await page.click('button:has-text("Enter")');

    // Error should show
    await page.waitForSelector('#password-error:not(.hidden)', { timeout: 3000 });
});

test('Phone with dashes works (existing user)', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    // Try an existing user from the CSV with dashes
    await page.fill('#phone-input', '010-1234-5678');
    await page.click('button:has-text("본인 인증")');

    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 5000 });
});

test('New Search button works', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.fill('#phone-input', '01012345678');
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 5000 });

    // Click "New Search"
    await page.click('button:has-text("New Search")');

    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 3000 });
});

test('Result view displays activity correctly', async (page) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('#input-view:not(.hidden)', { timeout: 10000 });

    await page.fill('#phone-input', '01012345678');
    await page.click('button:has-text("본인 인증")');
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 5000 });

    const activityText = await page.textContent('#res-activity-summary');
    if (!activityText || activityText === 'Activity') {
        throw new Error(`Activity not loaded properly: ${activityText}`);
    }
});

// Run all tests
runTests();
