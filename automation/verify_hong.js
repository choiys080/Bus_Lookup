const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true }); // Run headless for speed
    const page = await browser.newPage();

    // High-res viewport for good screenshot
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12/13 dims

    console.log('Navigating to site...');
    await page.goto('https://prismatic-salamander-40f491.netlify.app/');

    // Wait for load
    await page.waitForTimeout(2000);

    console.log('Entering credentials...');
    await page.fill('#name-input', '홍길동');
    await page.fill('#phone-input', '01012345678');

    // Click verify
    await page.click('button:has-text("본인 인증")'); // Adjust selector as needed, or precise ID
    // ID is verify-btn based on code read earlier? or just check button text or position
    // Earlier subagent step 12 clicked X=500 Y=941. Let's find button by text or ID.

    // Let's assume the verify button is the primary button in input-view.
    // Or check if ID exists.
    // Based on index.html: <button onclick="handleLookup()" ...>
    // Better to use click by text "본인 인증" or "VERIFY"

    // Wait for result
    await page.waitForSelector('#result-view:not(.hidden)', { timeout: 5000 });
    console.log('Result view visible.');

    // Wait a bit for animations
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshotPath = 'd:\\Antigravity\\Bus_Lookup\\hong_verified_final.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

    await browser.close();
})();
