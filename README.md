# Appium Navigation Tracker

A powerful utility package to track screen navigations in mobile app tests using Appium. This package automatically captures screen transitions during your automated tests, providing detailed navigation paths and timestamps for better test analysis.

## Features

- 📱 Works with both Android and iOS applications
- 🔄 Automatically tracks screen transitions during test execution
- 📊 Generates detailed navigation reports in JSON format
- 🧠 Smart screen name detection using multiple strategies
- 🚀 Framework-agnostic design - works with any JavaScript Appium setup
- ⚡ Zero-config mode - works without modifying your tests

## Installation

```bash
npm install appium-navigation-tracker --save-dev
```

## Zero-Config Usage (Recommended)

Appium Navigation Tracker can automatically track screen transitions without requiring any changes to your test scripts. Simply configure it in your test setup file:

### Using Environment Variables

Add these to your environment variables or `.env` file:

```
NAVIGATION_TRACKER_ENABLED=true
NAVIGATION_TRACKER_AUTO_SAVE=true
```

### Automatic Integration

For most frameworks, simply add this line to your test setup file:

```javascript
// Add this to the top of your main test file or setup file
require("appium-navigation-tracker/auto");
```

The auto-configure module automatically:

1. Detects your Appium driver instance
2. Hooks into navigation events
3. Tracks screen transitions
4. Saves results at the end of your test

No additional code changes required! The tracker will automatically:
- Hook into your driver's navigation methods
- Track screen changes
- Save results when your tests complete

### Example Auto-Configuration

```javascript
// In your test setup file (e.g., wdio.conf.js, setup.js, etc.)
process.env.NAVIGATION_TRACKER_ENABLED = "true";
process.env.NAVIGATION_TRACKER_AUTO_SAVE = "true";
require("appium-navigation-tracker/auto");

// Rest of your normal test setup
// ...
```

## Manual Integration (Optional)

If you need more control over the navigation tracking, you can use the manual integration approach.

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

## Framework-Specific Auto-Configuration

### WebdriverIO

In your wdio.conf.js file:

```javascript
// wdio.conf.js
const { setupNavigationTracker } = require('appium-navigation-tracker/wdio');

exports.config = {
  // Your existing WebdriverIO config
  
  // Add these hooks
  beforeSession: function() {
    process.env.NAVIGATION_TRACKER_ENABLED = "true";
  },
  
  before: function() {
    setupNavigationTracker();
  },
  
  afterTest: function() {
    // Results are automatically saved
  }
};
```

### Mocha/Jasmine

```javascript
// In your test setup file
const { setupNavigationTracker } = require('appium-navigation-tracker/mocha');

before(function() {
  setupNavigationTracker();
});

after(function() {
  // Navigation results are automatically saved
});
```

### Jest

```javascript
// In your jest setup file
const { setupNavigationTracker } = require('appium-navigation-tracker/jest');

beforeAll(() => {
  setupNavigationTracker();
});

afterAll(() => {
  // Navigation results are automatically saved
});
```

## Advanced Integration (Optional)

If you need more control over navigation tracking, these optional integrations can enhance the accuracy.

### Enhanced Click Tracking

For more accurate screen tracking, you can wrap click actions (optional but recommended):

```javascript
// Define once in your test helper
async function enhancedClick(elementSelector, description) {
  // The driver and navigationTracker are auto-detected
  await global.navigationTracker.beforeClick(elementSelector);
  await element(elementSelector).click();
  await global.navigationTracker.afterClick();
}

// Use in your tests
await enhancedClick('#login-button', 'login button');
```

### Manual Screen Recording

Explicitly record screen changes if needed:

```javascript
// After an important UI change
await global.navigationTracker.recordScreen('Login Screen');
```

## Framework Integration Examples

### Standard Appium with WD (Node.js)

```javascript
// Auto-configuration approach (recommended)
require("appium-navigation-tracker/auto");

const wd = require("wd");
const driver = wd.promiseRemote('http://localhost:4723/wd/hub');

async function runTest() {
  await driver.init(capabilities);
  
  // Navigate through the app normally
  const loginButton = await driver.elementById('login_button');
  await loginButton.click();
  
  // Navigation is tracked automatically!
  
  await driver.quit();
  // Results are saved automatically
}

runTest();
```

### WebdriverIO Integration

```javascript
// wdio.conf.js
require("appium-navigation-tracker/auto");

// Your test
describe('My App Test', () => {
  it('should navigate through the app', async () => {
    await $('~login_button').click();
    // Navigation is automatically tracked
  });
});
```

## Configuration Options

You can customize the navigation tracker with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NAVIGATION_TRACKER_ENABLED` | Enable/disable navigation tracking | `true` |
| `NAVIGATION_TRACKER_AUTO_SAVE` | Automatically save results | `true` |
| `NAVIGATION_TRACKER_RESULTS_DIR` | Directory to save results | `./test-results` |
| `NAVIGATION_TRACKER_MIN_INTERVAL` | Minimum interval between checks (ms) | `300` |
| `NAVIGATION_TRACKER_VERBOSE` | Enable verbose logging | `false` |

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

## How It Works

The auto-configuration module:

1. Monkey-patches the Appium driver methods that trigger navigation events
2. Sets up listeners for screen changes
3. Registers hooks into the test lifecycle to save results
4. Detects element interactions to better identify screens
5. Handles different frameworks' specific driver implementations automatically

This approach minimizes the code changes needed while providing reliable navigation tracking.

## Troubleshooting

### Screen Names Not Accurate

If the tracker isn't detecting screen names correctly:

1. Set `NAVIGATION_TRACKER_VERBOSE=true` to see detailed logging
2. Use the manual integration approach for more control
3. Consider adding custom screen identification rules

### No Navigation Events Recorded

If no navigation events are being recorded:

1. Make sure `NAVIGATION_TRACKER_ENABLED=true` is set
2. Check if your framework has a supported auto-configuration
3. Verify that the auto-configuration is imported before your test code runs

### Remote Testing Services

When using cloud testing services like LambdaTest, BrowserStack, etc:

1. Some methods like shell commands might be restricted
2. Auto-configuration usually works but may need framework-specific setup
3. Make sure to set proper timeouts as remote executions can be slower

## License

MIT 