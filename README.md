# Appium Navigation Tracker

A powerful utility package to track screen navigations in mobile app tests using Appium. This package automatically captures screen transitions during your automated tests, providing detailed navigation paths and timestamps for better test analysis.

## Features

- 📱 Works with both Android and iOS applications
- 🔄 Automatically tracks screen transitions during test execution
- 📊 Generates detailed navigation reports in JSON format
- 🧠 Smart screen name detection using multiple strategies
- 🚀 Framework-agnostic design - works with any JavaScript Appium setup

## Installation

```bash
npm install appium-navigation-tracker --save-dev
```

## Quick Start

```javascript
const { NavigationTracker } = require("appium-navigation-tracker");

// Initialize the tracker with your Appium driver
const navigationTracker = new NavigationTracker(
  driver,                // Your Appium driver instance
  "My Test Name",        // Name of your test
  "test_file.js",        // Name of the test file
  driver.sessionId       // Session ID (optional)
);

// Track navigation at any point
await navigationTracker.trackNavigation();

// At the end of your test, save the results
await navigationTracker.saveResults();
```

## Framework Integration Guide

### Standard Appium with WD (Node.js)

```javascript
const wd = require("wd");
const { NavigationTracker } = require("appium-navigation-tracker");

const driver = wd.promiseRemote('http://localhost:4723/wd/hub');

async function runTest() {
  await driver.init(capabilities);
  
  // Initialize tracker
  const navigationTracker = new NavigationTracker(
    driver,
    "Sample Test",
    "test.js",
    driver.sessionId
  );
  
  // Track initial navigation
  await navigationTracker.trackNavigation();
  
  // Enhanced click function with navigation tracking
  async function enhancedClick(elementId, description) {
    // Tell the navigation tracker we're about to click
    await navigationTracker.beforeClick(elementId);
    
    // Find and click the element
    const element = await driver.elementById(elementId);
    await element.click();
    
    // Tell tracker click is complete
    await navigationTracker.afterClick();
  }
  
  // Use the enhanced click function
  await enhancedClick('login_button', 'Clicking login button');
  
  // Save navigation results at the end of your test
  await navigationTracker.saveResults();
  
  await driver.quit();
}

runTest();
```

### WebdriverIO Integration

```javascript
const { NavigationTracker } = require("appium-navigation-tracker");

describe('My App Test', () => {
  let navigationTracker;
  
  before(async () => {
    // Initialize NavigationTracker with WebdriverIO's driver
    navigationTracker = new NavigationTracker(
      driver,
      "WebdriverIO Test",
      "wdio-test.js",
      browser.sessionId
    );
    
    // Add hooks to WebdriverIO's click command
    const originalClick = browser.originals.click;
    browser.overwriteCommand('click', async function (originalClickFn, selector) {
      // Before click
      const elementId = await $(selector).getAttribute('resource-id') || selector;
      await navigationTracker.beforeClick(elementId);
      
      // Execute original click
      await originalClickFn(selector);
      
      // After click
      await navigationTracker.afterClick();
    });
  });
  
  it('should navigate through the app', async () => {
    // Your test code here
    await navigationTracker.trackNavigation();
    
    await $('~login_button').click();
    // Navigation is automatically tracked due to the overwritten click command
  });
  
  after(async () => {
    // Save navigation results
    await navigationTracker.saveResults();
  });
});
```

### Protractor Integration

```javascript
const { NavigationTracker } = require("appium-navigation-tracker");

describe('My Protractor App Test', () => {
  let navigationTracker;
  
  beforeAll(async () => {
    // Initialize NavigationTracker with Protractor's browser
    navigationTracker = new NavigationTracker(
      browser.driver,
      "Protractor Test",
      "protractor-test.js",
      browser.driver.getSession().then(session => session.getId())
    );
    
    // Track initial navigation
    await navigationTracker.trackNavigation();
  });
  
  it('should navigate through the app', async () => {
    // Helper function for enhanced clicking
    async function enhancedClick(element, description) {
      const elementId = await element.getAttribute('resource-id') || description;
      await navigationTracker.beforeClick(elementId);
      await element.click();
      await navigationTracker.afterClick();
    }
    
    // Use the enhanced click function
    await enhancedClick(element(by.id('login_button')), 'login_button');
  });
  
  afterAll(async () => {
    // Save navigation results
    await navigationTracker.saveResults();
  });
});
```

### Detox Integration

```javascript
const { NavigationTracker } = require("appium-navigation-tracker");
const wd = require("wd");

describe('My Detox Test', () => {
  let navigationTracker;
  let appiumDriver;
  
  beforeAll(async () => {
    // Create an Appium driver instance that connects to the Detox server
    appiumDriver = wd.promiseRemote({
      hostname: 'localhost',
      port: 4723,
    });
    
    await appiumDriver.init({
      platformName: device.getPlatform(),
      automationName: device.getPlatform() === 'ios' ? 'XCUITest' : 'UiAutomator2',
      deviceName: device.name,
      app: device.getBundleId()
    });
    
    // Initialize NavigationTracker
    navigationTracker = new NavigationTracker(
      appiumDriver,
      "Detox Test",
      "detox-test.js",
      appiumDriver.sessionId
    );
    
    // Track initial navigation
    await navigationTracker.trackNavigation();
  });
  
  it('should navigate through the app', async () => {
    // Use Detox for test actions
    await element(by.id('login_button')).tap();
    
    // Manually track navigation after Detox actions
    await navigationTracker.trackNavigation();
  });
  
  afterAll(async () => {
    // Save navigation results
    await navigationTracker.saveResults();
    await appiumDriver.quit();
  });
});
```

### NightwatchJS Integration

```javascript
const { NavigationTracker } = require("appium-navigation-tracker");

module.exports = {
  before: async function(browser) {
    // Initialize the navigation tracker
    browser.navigationTracker = new NavigationTracker(
      browser.driver,
      "Nightwatch Test",
      "nightwatch-test.js",
      browser.sessionId
    );
    
    // Track initial navigation
    await browser.navigationTracker.trackNavigation();
  },
  
  'My app test': async function(browser) {
    // Helper function to enhance clicks with tracking
    browser.enhancedClick = async function(selector, description) {
      await browser.navigationTracker.beforeClick(selector);
      await browser.click(selector);
      await browser.navigationTracker.afterClick();
    };
    
    // Use the enhanced click
    await browser.enhancedClick('#login_button', 'login_button');
  },
  
  after: async function(browser) {
    // Save navigation results
    await browser.navigationTracker.saveResults();
    browser.end();
  }
};
```

## API Reference

### Constructor

```javascript
new NavigationTracker(driver, testName, specFile, sessionId)
```

- `driver`: Your Appium driver instance
- `testName`: Name of your test (for reporting)
- `specFile`: Name of your test file (for reporting)  
- `sessionId`: Current Appium session ID (optional)

### Methods

#### trackNavigation()

Tracks the current screen and adds it to the navigation history if it has changed.

```javascript
await navigationTracker.trackNavigation();
```

#### beforeClick(elementId)

Notifies the tracker that a click is about to happen, allowing it to identify screen transitions.

```javascript
await navigationTracker.beforeClick('login_button');
```

#### afterClick()

Should be called after a click operation to record screen changes.

```javascript
await navigationTracker.afterClick();
```

#### recordUserAction(elementId)

Manually record a user action when direct hooks aren't possible.

```javascript
await navigationTracker.recordUserAction('login_button');
```

#### saveResults()

Saves the navigation tracking results to a JSON file in the `test-results` directory.

```javascript
await navigationTracker.saveResults();
```

## Output Format

The tracker saves a JSON file with the following structure:

```json
{
  "spec_file": "test.js",
  "test_name": "Sample Test",
  "session_id": "12345-session-id",
  "navigations": [
    {
      "previous_screen": "",
      "current_screen": "App Start",
      "timestamp": "2023-05-10T12:00:00.000Z",
      "navigation_type": "test_start"
    },
    {
      "previous_screen": "App Start",
      "current_screen": "Home Screen",
      "timestamp": "2023-05-10T12:00:01.000Z",
      "navigation_type": "navigation_detected"
    }
  ],
  "timestamp": "2023-05-10T12:00:00.000Z",
  "save_timestamp": "2023-05-10T12:01:00.000Z", 
  "navigation_count": 2
}
```

## Troubleshooting

### Screen Names Not Accurate

If the tracker isn't detecting screen names correctly:

1. Use the `recordUserAction` method to explicitly tell the tracker which screen you're on
2. Add more screen identifiers to the detection logic for your specific app
3. Check if the page source is accessible from your test environment

### No Navigation Events Recorded

If no navigation events are being recorded:

1. Make sure you're calling `trackNavigation()` after screen transitions
2. Verify that `beforeClick` and `afterClick` are called properly
3. Add a delay after actions to allow the UI to update before tracking

### Remote Testing Services

When using cloud testing services like LambdaTest, BrowserStack, etc:

1. Some methods like shell commands might be restricted
2. Prefer using the Element ID tracking approach shown in the examples
3. Make sure to set proper timeouts as remote executions can be slower

## License

MIT 