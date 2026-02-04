const { chromium } = require('playwright');

async function debug() {
    console.log('--- Quick Debug ---');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        await page.goto('http://localhost:3000/');
        await page.waitForTimeout(5000); // Wait for initialization

        const viewsStatus = await page.evaluate(() => {
            const views = ['loading-view', 'admin-view', 'input-view', 'result-view', 'error-view'];
            const res = {};
            views.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    res[id] = el.classList.contains('hidden') ? 'hidden' : 'VISIBLE';
                } else {
                    res[id] = 'MISSING';
                }
            });
            return res;
        });

        console.log('--- VIEWS STATUS ---');
        console.log(JSON.stringify(viewsStatus, null, 2));
        console.log('--------------------');

        await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\debug_input_view.png' });

        // Go to Admin
        console.log('Logging in as Admin...');
        await page.evaluate(() => {
            window.toggleAdmin();
            document.getElementById('password-input').value = 'admin123';
            window.submitPassword();
        });

        await page.waitForTimeout(1000); // Wait for transition
        await page.screenshot({ path: 'd:\\Antigravity\\Bus_Lookup\\debug_admin_view.png' });
        console.log('Saved debug_admin_view.png');
    } catch (e) {
        console.log('Debug Failed:', e.message);
    } finally {
        await browser.close();
    }
}

debug();
