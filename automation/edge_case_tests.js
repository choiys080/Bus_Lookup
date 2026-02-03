const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:3000/';

// Test categories
const EDGE_CASE_TESTS = [
    // INPUT VALIDATION TESTS
    {
        name: 'Empty phone number', fn: async (page) => {
            await page.fill('#phone-input', '');
            // Remove default handler temporarily
            let alertTriggered = false;
            const handler = async (dialog) => {
                alertTriggered = dialog.message().includes('연락처');
                await dialog.accept();
            };
            page.on('dialog', handler);
            await page.click('button:has-text("본인 인증")');
            await page.waitForTimeout(1000);
            page.removeListener('dialog', handler);
            return alertTriggered;
        }
    },

    {
        name: 'Only spaces in phone', fn: async (page) => {
            await page.fill('#phone-input', '   ');
            let alertTriggered = false;
            const handler = async (dialog) => {
                alertTriggered = dialog.message().includes('연락처');
                await dialog.accept();
            };
            page.on('dialog', handler);
            await page.click('button:has-text("본인 인증")');
            await page.waitForTimeout(1000);
            page.removeListener('dialog', handler);
            return alertTriggered;
        }
    },
    {
        name: 'Letters in phone number', fn: async (page) => {
            await page.fill('#phone-input', 'abc123def');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    {
        name: 'Special characters only', fn: async (page) => {
            await page.fill('#phone-input', '!@#$%^&*()');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    {
        name: 'Very long number (50 digits)', fn: async (page) => {
            await page.fill('#phone-input', '01012345678901234567890123456789012345678901234567');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    {
        name: 'Short number (3 digits)', fn: async (page) => {
            await page.fill('#phone-input', '010');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    {
        name: 'Phone with Korean characters', fn: async (page) => {
            await page.fill('#phone-input', '010가나다1234');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    {
        name: 'Phone with emoji', fn: async (page) => {
            await page.fill('#phone-input', '010📱1234📞5678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    // VALID PHONE FORMAT VARIATIONS
    {
        name: 'Phone with dashes (valid)', fn: async (page) => {
            await page.fill('#phone-input', '010-1234-5678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            return true;
        }
    },

    {
        name: 'Phone with spaces (valid)', fn: async (page) => {
            await page.fill('#phone-input', '010 1234 5678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            return true;
        }
    },

    {
        name: 'Phone with dots (valid)', fn: async (page) => {
            await page.fill('#phone-input', '010.1234.5678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            return true;
        }
    },

    {
        name: 'Phone with +82 prefix (valid)', fn: async (page) => {
            await page.fill('#phone-input', '+82 10-1234-5678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            return true;
        }
    },

    // INTERNATIONAL NUMBER TEST
    {
        name: 'Mongolian number +976', fn: async (page) => {
            await page.fill('#phone-input', '+976-99990815');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            const name = await page.textContent('#res-name');
            return name.includes('Lkhaashid') || name.includes('Munkhdelger');
        }
    },

    // ADMIN PASSWORD TESTS
    {
        name: 'Empty admin password', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', '');
            await page.click('button:has-text("Enter")');
            const errorVisible = await page.isVisible('#password-error:not(.hidden)');
            await page.click('button:has-text("Cancel")');
            return errorVisible;
        }
    },

    {
        name: 'Wrong admin password', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', 'wrongpassword');
            await page.click('button:has-text("Enter")');
            const errorVisible = await page.isVisible('#password-error:not(.hidden)');
            await page.click('button:has-text("Cancel")');
            return errorVisible;
        }
    },

    {
        name: 'SQL injection attempt in password', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', "' OR '1'='1");
            await page.click('button:has-text("Enter")');
            const errorVisible = await page.isVisible('#password-error:not(.hidden)');
            await page.click('button:has-text("Cancel")');
            return errorVisible; // Should show error, not grant access
        }
    },

    {
        name: 'XSS attempt in password', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', '<script>alert("XSS")</script>');
            await page.click('button:has-text("Enter")');
            const errorVisible = await page.isVisible('#password-error:not(.hidden)');
            await page.click('button:has-text("Cancel")');
            return errorVisible;
        }
    },

    {
        name: 'Correct admin password', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', 'admin123');
            await page.click('button:has-text("Enter")');
            await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });
            await page.click('button:has-text("EXIT")');
            return true;
        }
    },

    // RAPID FIRE TESTS (UI Stress)
    {
        name: 'Rapid search button clicks', fn: async (page) => {
            await page.fill('#phone-input', '01012345678');
            // Click 5 times rapidly
            for (let i = 0; i < 5; i++) {
                await page.click('button:has-text("본인 인증")', { force: true });
            }
            await page.waitForTimeout(3000);
            // Should settle to result or error, not crash
            const resultVisible = await page.isVisible('#result-view:not(.hidden)');
            const errorVisible = await page.isVisible('#error-view:not(.hidden)');
            return resultVisible || errorVisible;
        }
    },

    {
        name: 'Rapid New Search clicks', fn: async (page) => {
            await page.fill('#phone-input', '01012345678');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
            // Click New Search 5 times rapidly
            for (let i = 0; i < 5; i++) {
                await page.click('button:has-text("New Search")', { force: true });
            }
            await page.waitForTimeout(1000);
            const inputVisible = await page.isVisible('#input-view:not(.hidden)');
            return inputVisible;
        }
    },

    // ERROR RECOVERY TESTS
    {
        name: 'Try Again button after error', fn: async (page) => {
            await page.fill('#phone-input', '00000000000');
            await page.click('button:has-text("본인 인증")');
            await page.waitForSelector('#error-view:not(.hidden)', { timeout: 5000 });
            await page.click('button:has-text("다시 시도하기")');
            await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });
            return true;
        }
    },

    // PAGE REFRESH TEST
    {
        name: 'Page refresh recovery', fn: async (page) => {
            await page.reload();
            await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });
            return true;
        }
    },

    // CONSECUTIVE LOOKUPS
    {
        name: 'Multiple different users in sequence', fn: async (page) => {
            const phones = ['01039203540', '01073316309', '01037477172'];
            for (const phone of phones) {
                await page.fill('#phone-input', phone);
                await page.click('button:has-text("본인 인증")');
                await page.waitForSelector('#result-view:not(.hidden)', { timeout: 8000 });
                await page.click('button:has-text("New Search")');
                await page.waitForSelector('#input-view:not(.hidden)', { timeout: 5000 });
            }
            return true;
        }
    },

    // ADMIN TAB SWITCHING
    {
        name: 'Admin tab switching stress', fn: async (page) => {
            await page.click('#admin-trigger');
            await page.waitForSelector('#password-modal:not(.hidden)', { timeout: 3000 });
            await page.fill('#password-input', 'admin123');
            await page.click('button:has-text("Enter")');
            await page.waitForSelector('#admin-view:not(.hidden)', { timeout: 5000 });

            // Rapid tab switching
            for (let i = 0; i < 5; i++) {
                await page.click('#tab-status-btn');
                await page.waitForTimeout(200);
                await page.click('#tab-log-btn');
                await page.waitForTimeout(200);
            }

            await page.click('button:has-text("EXIT")');
            return true;
        }
    },
];

async function runEdgeCaseTests() {
    console.log('🔥 EDGE CASE & STRESS TEST SUITE');
    console.log('='.repeat(50) + '\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 400
    });

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < EDGE_CASE_TESTS.length; i++) {
        const test = EDGE_CASE_TESTS[i];
        const progress = `[${i + 1}/${EDGE_CASE_TESTS.length}]`;

        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setViewportSize({ width: 450, height: 900 });

        // No global dialog handler - individual tests handle dialogs as needed
        try {
            console.log(`${progress} ⏳ ${test.name}...`);
            await page.goto(LOCAL_URL);
            await page.waitForSelector('#input-view:not(.hidden)', { timeout: 15000 });

            const result = await test.fn(page);

            if (result) {
                console.log(`${progress} ✅ ${test.name} PASSED`);
                passed++;
            } else {
                console.log(`${progress} ❌ ${test.name} FAILED (returned false)`);
                failed++;
                failures.push({ name: test.name, error: 'Test returned false' });
            }
        } catch (err) {
            console.log(`${progress} ❌ ${test.name} FAILED`);
            console.log(`         Error: ${err.message}`);
            failed++;
            failures.push({ name: test.name, error: err.message });
        }

        await context.close();
    }

    await browser.close();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total:  ${EDGE_CASE_TESTS.length}`);

    if (failures.length > 0) {
        console.log('\n❌ FAILURES:');
        failures.forEach((f, i) => {
            console.log(`   ${i + 1}. ${f.name}`);
            console.log(`      Error: ${f.error}`);
        });
    } else {
        console.log('\n🎉 ALL EDGE CASE TESTS PASSED!');
    }
}

runEdgeCaseTests().catch(console.error);
