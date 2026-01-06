
const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');

async function runTest() {
    let driver = await new Builder().forBrowser('chrome').build();
    let testResults = [];

    try {
        console.log("Starting Admin Login Test...");

        // 1. Navigate to Login Page
        await driver.get('http://localhost:5136/admin-login.html');
        await driver.manage().window().maximize(); // Ensure full view
        console.log("Navigated to Admin Login Page");

        // 2. Perform Login
        // Verify overlay is hidden
        const overlay = await driver.findElement(By.id('loading-overlay'));
        await driver.wait(until.elementIsNotVisible(overlay), 5000);

        // Wait for Loading class
        await driver.wait(until.elementLocated(By.className('loaded')), 5000);
        await driver.sleep(2000); // Generous buffer

        const emailInput = await driver.findElement(By.id('login-email'));

        // DEBUG: Check status
        const isDisplayed = await emailInput.isDisplayed();
        const isEnabled = await emailInput.isEnabled();
        console.log(`Email Input State -> Displayed: ${isDisplayed}, Enabled: ${isEnabled}`);

        // Force scroll
        await driver.executeScript("arguments[0].scrollIntoView(true);", emailInput);

        // ROBUST: Set value directly using JavaScript to bypass "element not interactable"
        // caused by potential invisible overlays or animations
        await driver.executeScript("arguments[0].value = 'etpatil62@gmail.com';", emailInput);

        const passwordInput = await driver.findElement(By.id('login-password'));
        await driver.executeScript("arguments[0].value = '123456789';", passwordInput);

        // FIX: The previous selector `button[type="submit"]` grabbed the hidden "Forgot Password" button first.
        // We must target the specific "Sign In" button inside the #login-form div.
        const submitBtn = await driver.findElement(By.css('#login-form button[type="submit"]'));
        await driver.executeScript("arguments[0].click();", submitBtn);
        console.log("Credentials entered via JS and Submit clicked. Waiting for navigation...");

        // DIAGNOSTIC CODE: Check if we are stuck on login page
        await driver.sleep(2000); // Give it a moment to process or redirect
        const currentUrl = await driver.getCurrentUrl();
        console.log("Current URL after 2s:", currentUrl);

        // Check for login errors (alert box)
        try {
            const alert = await driver.findElement(By.id('alert'));
            const alertText = await alert.getText();
            if (alertText) console.log("Login Page Alert Found:", alertText);
        } catch (e) {
            // No alert found, which is good if we expect success
        }

        // 3. Verify Dashboard
        const dashboard = await driver.wait(until.elementLocated(By.id('dashboard')), 10000);
        await driver.wait(until.elementIsVisible(dashboard), 5000);
        console.log("TEST PASSED: Admin Dashboard loaded successfully!");

        testResults.push({ step: "Navigating to Login", status: "PASSED", details: "Page loaded" });
        testResults.push({ step: "Admin Login", status: "PASSED", details: "Credentials accepted, Dashboard visible" });

        // --- STEP 4: CREATE EVENT TEST ---
        console.log("\nStarting Event Creation Test...");

        // 4.1 Navigate to Event Management
        // Sidebar link: <a href="#" onclick="showSection('manage-events')">
        const manageEventsLink = await driver.findElement(By.xpath("//a[contains(@onclick, 'manage-events')]"));
        // Ensure it's clickable
        await driver.wait(until.elementIsVisible(manageEventsLink), 2000);
        await manageEventsLink.click();
        console.log("Clicked 'Manage Events' sidebar link");

        // 4.2 Get Initial Event Count
        const countEl = await driver.findElement(By.id('totalEventsCount'));
        await driver.wait(until.elementIsVisible(countEl), 2000);
        // Wait for count to settle (initially 0, then updates)
        await driver.sleep(1000);
        const initialText = await countEl.getText();
        const initialCount = parseInt(initialText) || 0;
        console.log(`Initial Event Count: ${initialCount}`);

        // 4.3 Open 'Create New Event' Modal
        const createBtn = await driver.findElement(By.xpath("//button[contains(., 'Create New Event')]"));
        await createBtn.click();

        const modal = await driver.findElement(By.id('eventModal'));
        await driver.wait(until.elementIsVisible(modal), 2000);
        console.log("Event Modal Opened");

        // 4.4 Fill Form
        const uniqueTitle = `Selenium Test Event ${Date.now()}`;
        await driver.findElement(By.id('eventTitle')).sendKeys(uniqueTitle);
        // Use logic to select first option if needed, but 'Webinar' is a value
        const typeSelect = await driver.findElement(By.id('eventType'));
        await typeSelect.click();
        await driver.findElement(By.css("#eventType option[value='webinar']")).click();

        // Date inputs
        await driver.executeScript("document.getElementById('eventDate').value = '2030-01-01'", []);
        await driver.executeScript("document.getElementById('eventStartTime').value = '10:00'", []);
        await driver.executeScript("document.getElementById('eventEndTime').value = '12:00'", []);

        await driver.findElement(By.id('eventLocation')).sendKeys('Virtual Selenium Grid');
        await driver.findElement(By.id('eventDescription')).sendKeys('This is an automated test event created by Selenium.');

        const statusSelect = await driver.findElement(By.id('eventStatus'));
        await statusSelect.click();
        await driver.findElement(By.css("#eventStatus option[value='upcoming']")).click();


        // 4.5 Submit Form
        const saveEventBtn = await driver.findElement(By.css('#eventForm button[type="submit"]'));
        await saveEventBtn.click();
        console.log("Event Form Submitted");

        // 4.6 Handle Success Alert
        try {
            await driver.wait(until.alertIsPresent(), 5000);
            const alert = await driver.switchTo().alert();
            const alertText = await alert.getText();
            console.log(`Alert appeared: "${alertText}"`);
            await alert.accept();
        } catch (e) {
            console.log("No alert appeared (or handled automatically). Continuing...");
        }

        // 4.7 Verify Count Increase
        console.log("Verifying event count update...");
        try {
            await driver.wait(async () => {
                const newText = await countEl.getText();
                const newCount = parseInt(newText) || 0;
                return newCount === initialCount + 1;
            }, 5000);

            const finalCount = await countEl.getText();
            console.log(`TEST PASSED: Event count increased from ${initialCount} to ${finalCount}`);
            testResults.push({ step: "Create Event", status: "PASSED", details: `Count increased: ${initialCount} -> ${finalCount}` });
        } catch (timeout) {
            const currentCount = await countEl.getText();
            console.error(`TEST FAILED: Event count did not increase. Stuck at ${currentCount}`);
            testResults.push({ step: "Create Event", status: "FAILED", details: `Count remained ${currentCount} (Expected ${initialCount + 1})` });
        }



    } catch (error) {
        console.error("TEST FAILED: An error occurred", error);
        testResults.push({ step: "Test Execution", status: "FAILED", details: error.message });


        // CAPTURE BROWSER CONSOLE LOGS
        try {
            const logs = await driver.manage().logs().get('browser');
            console.log("=== BROWSER CONSOLE LOGS ===");
            logs.forEach(log => console.log(`[${log.level.name}] ${log.message} `));
            console.log("============================");
        } catch (logError) {
            console.log("Could not retrieve browser logs:", logError.message);
        }

        const screenshot = await driver.takeScreenshot();
        fs.writeFileSync('test_failure.png', screenshot, 'base64');
        console.log("Screenshot saved to test_failure.png");

        const report = `
# Selenium Test Report
        Date: ${new Date().toLocaleString()}

## Admin Login Test
            - ** Status **: FAILED
                - ** Error **: ${error.message}
        `;
        fs.writeFileSync('selenium_test_report.md', report);
    } finally {
        await driver.quit();
        // Generate Report Content
        const reportContent = `
# Selenium Test Report
            ** Date:** ${new Date().toLocaleString()}
** Test Suite:** Admin Login Verification

            | Step | Status | Details |
| ------| --------| ---------|
            ${testResults.map(r => `| ${r.step} | **${r.status}** | ${r.details} |`).join('\n')}

** Summary:** ${testResults.every(r => r.status === 'PASSED') ? 'All checks passed ✅' : 'Some checks failed ❌'}
        `;

        // Write to file
        fs.writeFileSync('C:/Users/guru3/.gemini/antigravity/brain/5a8324d8-425d-4f82-b1ec-9726451e3546/selenium_test_report.md', reportContent);
        console.log("Report generated: selenium_test_report.md");
    }
}

runTest();
