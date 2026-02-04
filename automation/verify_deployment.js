const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url = 'https://choiys080.github.io/Bus_Lookup/';
    console.log(`Navigating to ${url}...`);

    try {
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        console.log(`Status: ${response.status()}`);
        console.log(`Title: ${await page.title()}`);

        // Check for specific elements that indicate the new version
        const countryCodeObj = await page.$('input[placeholder="+82"]');
        const hasCountryCode = !!countryCodeObj;
        console.log(`Has Country Code Input: ${hasCountryCode}`);

        const bgImage = await page.$('.absolute.inset-0 img');
        let hasBgImage = false;
        if (bgImage) {
            const src = await bgImage.getAttribute('src');
            hasBgImage = src && src.includes('unsplash');
            console.log(`Background Image Src: ${src}`);
        }
        console.log(`Has Unsplash Background: ${hasBgImage}`);

        // Screenshot
        const screenshotPath = path.join(__dirname, '../ref/deployment_verification.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
})();
