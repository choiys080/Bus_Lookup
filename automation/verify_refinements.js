const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

async function verifyRefinements() {
    console.log('🧪 VERIFYING AESTHETIC REFINEMENTS');
    console.log('==================================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 600
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    console.log('1. Verifying Login Page (Input View)...');
    await page.goto(LOCAL_URL);
    await page.waitForSelector('#loading-view', { state: 'hidden', timeout: 30000 });

    // Check banner text
    const bannerText = await page.textContent('p.text-black.font-black.uppercase');
    console.log('Banner text:', bannerText.trim());

    // Check button text
    const btnText = await page.textContent('#verify-btn span');
    console.log('Button text:', btnText.trim());

    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\login_refinement_verify.png' });

    console.log('\n2. Verifying Result Page (Itinerary View)...');
    await page.fill('#name-input', '홍길동');
    await page.fill('#phone-input', '01012345678');
    await page.click('#verify-btn');

    await page.waitForSelector('#result-view:not(.hidden)');

    // Check activity detail text
    const activityDetail = await page.textContent('#res-activity-detail');
    console.log('Activity Detail text:', activityDetail.trim());

    // Check if image banner is gone (height check)
    const bannerHeight = await page.$eval('#result-view', el => el.querySelector('.h-48') ? 'found' : 'missing').catch(() => 'missing');
    console.log('Visual image banner (h-48):', bannerHeight);

    await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\result_refinement_verify.png' });

    console.log('\n📸 Screenshots saved to login_refinement_verify.png and result_refinement_verify.png');

    await browser.close();
}

verifyRefinements().catch(console.error);
