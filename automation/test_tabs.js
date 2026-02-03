const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

async function verifyTabs() {
    console.log('🧪 VERIFYING TAB SWAP');
    console.log('======================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('1. Loading app and entering Admin mode...');
    await page.goto(LOCAL_URL);
    await page.waitForSelector('#loading-view', { state: 'hidden', timeout: 30000 });

    await page.click('#admin-trigger');
    await page.waitForSelector('#password-modal:not(.hidden)');
    await page.fill('#password-input', 'admin123');
    await page.click('#password-modal button:has-text("Enter")');
    await page.waitForSelector('#admin-view:not(.hidden)');

    console.log('2. Checking tab order and visibility...');

    // Check if Attendance Status is first and visible
    const firstTabVisible = await page.isVisible('#attendance-status-container:not(.hidden)');
    console.log('Attendance Status visible by default:', firstTabVisible);

    const logTabHidden = await page.isVisible('#checkin-log-container.hidden');
    console.log('Check-in Log hidden by default:', logTabHidden);

    const buttons = await page.$$eval('.flex.gap-4.mb-4.border-b button', nodes => nodes.map(n => n.textContent.trim()));
    console.log('Tab button order:', buttons);

    if (buttons[0].includes('Attendance') && firstTabVisible) {
        console.log('✅ Tab swap verified!');
    } else {
        console.log('❌ Tab swap failed');
    }

    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\tab_swap_verify.png' });
    await browser.close();
}

verifyTabs().catch(console.error);
