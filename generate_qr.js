const { chromium } = require('playwright');
const fs = require('fs');

async function generateQRCode(url, filename) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Navigate to QR code generator
    await page.goto('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url));
    
    // Take screenshot of the QR code
    await page.screenshot({ path: filename, fullPage: false });
    
    await browser.close();
    console.log(`QR code saved as ${filename}`);
}

// Generate QR code for the production URL, overwriting the existing activity portal QR
generateQRCode('https://bbraun-itinerary-v2.pages.dev', 'activity_portal_qr.png');
