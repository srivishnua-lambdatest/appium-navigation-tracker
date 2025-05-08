import * as fs from 'fs';
import * as path from 'path';

interface Navigation {
  previous_screen: string;
  current_screen: string;
  timestamp: string;
  navigation_type: string;
}

interface TestResult {
  spec_file: string;
  test_name: string;
  session_id: string;
  navigations: Navigation[];
  timestamp: string;
  save_timestamp: string;
  navigation_count: number;
}

interface ElementInfo {
  id?: string;
  text?: string;
  className?: string;
}

export class NavigationTracker {
  private driver: any; // Appium driver instance
  private currentScreen: string = '';
  private navigations: Navigation[] = [];
  private testName: string;
  private specFile: string;
  private sessionId: string;
  private resultsDir: string;
  private isAndroid: boolean = false;
  private isIOS: boolean = false;
  private platformName: string = 'unknown';
  private lastCheckTime: number = 0;
  private minCheckInterval: number = 300; // Minimum ms between checks
  
  // For tracking UI changes
  private lastPageSourceHash: string = '';
  
  // For tracking user interactions
  private lastAction: string = '';
  private actionScreenMap: Map<string, string> = new Map();
  
  // Known screen elements to detect
  private knownScreens: { [key: string]: string[] } = {
    'Home': ['color', 'Text', 'toast', 'notification', 'geoLocation', 'speedTest', 'webview'],
    'Color': ['colorSelection', 'Back'],
    'Text': ['textInput', 'Back'],
    'Toast': ['showToast', 'Back'],
    'Notification': ['showNotification', 'Back'],
    'Geolocation': ['gpsLocation', 'Back'],
    'SpeedTest': ['startTest', 'Back'],
    'WebView': ['url', 'find']
  };

  constructor(driver: any, testName: string, specFile: string, sessionId: string) {
    this.driver = driver;
    this.testName = testName;
    this.specFile = specFile;
    this.sessionId = sessionId;
    this.resultsDir = path.join(process.cwd(), 'test-results');
    
    console.log('[NavigationTracker] Initializing with:', { testName, specFile, sessionId });
    
    // Reset test-results directory
    this.resetResultsDirectory();
    
    // Detect platform immediately (synchronous check)
    this.detectPlatformSync();
    
    // Initialize action to screen mapping
    this.initializeActionScreenMap();
  }

  private resetResultsDirectory() {
    // Remove test-results directory if it exists
    if (fs.existsSync(this.resultsDir)) {
      console.log('[NavigationTracker] Resetting test-results directory');
      fs.rmSync(this.resultsDir, { recursive: true, force: true });
    }
    // Create fresh test-results directory
    fs.mkdirSync(this.resultsDir, { recursive: true });

    // Add initial navigation
    this.addNavigation('', 'App Start', 'test_start');
  }

  /**
   * Fast synchronous detection based on driver properties
   */
  private detectPlatformSync() {
    try {
      // Most drivers store platform info in capabilities or settings
      const capabilities = this.driver.capabilities || this.driver.caps || {};
      const automationName = capabilities.automationName || '';
      const platformName = capabilities.platformName || '';

      this.isAndroid = automationName.toLowerCase().includes('android') || 
                      platformName.toLowerCase() === 'android';
                      
      this.isIOS = automationName.toLowerCase().includes('ios') || 
                   automationName.toLowerCase().includes('xcuitest') ||
                   platformName.toLowerCase() === 'ios';
      
      this.platformName = this.isAndroid ? 'Android' : this.isIOS ? 'iOS' : 'Unknown';
      
      console.log(`[NavigationTracker] Platform detected: ${this.platformName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[NavigationTracker] Error in platform detection:', errorMsg);
    }
  }

  /**
   * Initialize a mapping of action elements to screen names
   * This helps us track navigation based on user interactions
   */
  private initializeActionScreenMap() {
    // Map element IDs to screens they lead to
    this.actionScreenMap.set('color', 'Color Screen');
    this.actionScreenMap.set('Text', 'Text Screen');
    this.actionScreenMap.set('toast', 'Toast Screen');
    this.actionScreenMap.set('notification', 'Notification Screen');
    this.actionScreenMap.set('geoLocation', 'Geolocation Screen');
    this.actionScreenMap.set('buttonPage', 'Home Screen');
    this.actionScreenMap.set('speedTest', 'Speed Test Screen');
    this.actionScreenMap.set('webview', 'WebView Screen');
    this.actionScreenMap.set('find', 'Browser Content Screen');
    this.actionScreenMap.set('Back', 'Home Screen');
    
    // Set initial screen
    this.currentScreen = 'Home Screen';
  }

  /**
   * Simple hash function for string comparison
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Record user action for screen tracking
   * This allows us to know what screen we're on based on the elements interacted with
   */
  public async recordUserAction(elementId: string) {
    this.lastAction = elementId;
    
    // Update current screen based on element interaction
    if (this.actionScreenMap.has(elementId)) {
      const newScreen = this.actionScreenMap.get(elementId) || '';
      if (newScreen && newScreen !== this.currentScreen) {
        await this.addNavigation(this.currentScreen, newScreen, 'user_interaction');
      }
    }
  }

  private async addNavigation(previousScreen: string, currentScreen: string, navigationType: string) {
    // Don't add if it's the same as the last one
    if (this.navigations.length > 0 && 
        this.navigations[this.navigations.length - 1].current_screen === currentScreen) {
      return;
    }
    
    const navigation: Navigation = {
      previous_screen: previousScreen,
      current_screen: currentScreen,
      timestamp: new Date().toISOString(),
      navigation_type: navigationType
    };
    this.navigations.push(navigation);
    this.currentScreen = currentScreen;
    console.log(`[NavigationTracker] Added navigation: ${previousScreen} -> ${currentScreen} (${navigationType})`);
  }

  public async trackNavigation() {
    try {
      // Skip frequent calls using throttling
      const now = Date.now();
      if (now - this.lastCheckTime < this.minCheckInterval) {
        console.log('[NavigationTracker] Skipping navigation check (throttled)');
        return;
      }
      
      this.lastCheckTime = now;
      
      // Get current screen name using multiple approaches
      const currentScreen = await this.getCurrentScreenName();
      
      // Only record navigation if screen has changed
      if (currentScreen && currentScreen !== this.currentScreen) {
        await this.addNavigation(this.currentScreen, currentScreen, 'navigation_detected');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[NavigationTracker] Error tracking navigation:', errorMsg);
    }
  }

  /**
   * Track navigation based on a page source analysis
   * Uses a hybrid of direct analysis and context inference
   */
  private async getCurrentScreenName(): Promise<string> {
    try {
      // If we've recently recorded a user action that led to a known screen, prefer that
      if (this.lastAction && this.actionScreenMap.has(this.lastAction)) {
        const inferredScreen = this.actionScreenMap.get(this.lastAction);
        if (inferredScreen) {
          // Reset lastAction to not repeat this inference next time
          this.lastAction = '';
          return inferredScreen;
        }
      }
      
      // Try to identify screen based on visible elements
      let pageSource = '';
      try {
        pageSource = await this.driver.getPageSource();
      } catch (e) {
        console.log('[NavigationTracker] Could not get page source');
      }
      
      if (pageSource) {
        // Calculate hash to check if screen has changed
        const sourceHash = this.hashString(pageSource);
        
        // If page source hasn't changed, we're still on the same screen
        if (sourceHash === this.lastPageSourceHash) {
          return this.currentScreen;
        }
        
        this.lastPageSourceHash = sourceHash;
        
        // Identify screen by looking for known elements
        const detectedScreen = this.identifyScreenFromPageSource(pageSource);
        if (detectedScreen) {
          return detectedScreen;
        }
      }
      
      // Use current URL for WebViews
      try {
        if (pageSource && (pageSource.includes('WebView') || pageSource.includes('webview'))) {
          const url = await this.driver.getCurrentUrl();
          if (url && typeof url === 'string') {
            return `WebView: ${url.split('/').pop() || url}`;
          }
        }
      } catch (e) {
        console.log('[NavigationTracker] Could not get current URL');
      }
      
      // If we've made it here, fallback to descriptive screen ID based on timestamp
      const now = new Date();
      const screenId = `Screen at ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      return screenId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[NavigationTracker] Error in getCurrentScreenName:', errorMsg);
      return this.currentScreen || 'Unknown Screen';
    }
  }

  /**
   * Analyze page source to identify the current screen
   */
  private identifyScreenFromPageSource(pageSource: string): string | null {
    try {
      // Generic detection patterns for common screens
      if (pageSource.includes('id="color"') && 
          pageSource.includes('id="Text"') && 
          pageSource.includes('id="toast"')) {
        return 'Home Screen';
      }
      
      if (pageSource.includes('id="url"') && pageSource.includes('id="find"')) {
        return 'WebView Screen';
      }
      
      if (pageSource.includes('id="Back"')) {
        // This is a detail screen, try to identify which one
        if (pageSource.includes('id="colorSelection"')) {
          return 'Color Screen';
        }
        if (pageSource.includes('id="textInput"')) {
          return 'Text Screen';
        }
        if (pageSource.includes('id="showToast"')) {
          return 'Toast Screen';
        }
        if (pageSource.includes('id="showNotification"')) {
          return 'Notification Screen';
        }
        if (pageSource.includes('id="gpsLocation"')) {
          return 'Geolocation Screen';
        }
        if (pageSource.includes('id="startTest"')) {
          return 'Speed Test Screen';
        }
      }
      
      // Look for specific text content
      if (pageSource.includes('>Color<') || pageSource.includes('"Color"')) {
        return 'Color Screen';
      }
      
      if (pageSource.includes('>Geolocation<') || pageSource.includes('"Geolocation"')) {
        return 'Geolocation Screen';
      }
      
      if (pageSource.includes('>Speed Test<') || pageSource.includes('"Speed Test"')) {
        return 'Speed Test Screen';
      }
      
      // Try to infer from URL display in webview
      if (pageSource.includes('www.lambdatest.com')) {
        return 'LambdaTest Website';
      }
      
      return null;
    } catch (error) {
      console.log('[NavigationTracker] Error identifying screen from page source');
      return null;
    }
  }

  /**
   * Hook to inject into a click method to track navigation
   * @param elementId The element ID being clicked
   */
  public async beforeClick(elementId: string) {
    if (elementId && this.actionScreenMap.has(elementId)) {
      this.lastAction = elementId;
    }
  }

  /**
   * Hook to inject after a click to check for navigation changes
   */
  public async afterClick() {
    // Add a small delay to wait for navigation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Track screen after clicking
    await this.trackNavigation();
  }

  public async saveResults() {
    try {
      console.log('[NavigationTracker] Saving navigation results...');
      console.log(`[NavigationTracker] Total navigation events: ${this.navigations.length}`);
      
      const result: TestResult = {
        spec_file: this.specFile,
        test_name: this.testName,
        session_id: this.sessionId,
        navigations: this.navigations,
        timestamp: new Date().toISOString(),
        save_timestamp: new Date().toISOString(),
        navigation_count: this.navigations.length
      };

      // Ensure directory exists
      if (!fs.existsSync(this.resultsDir)) {
        fs.mkdirSync(this.resultsDir, { recursive: true });
      }

      const filePath = path.join(this.resultsDir, 'navigation-tracking.json');
      console.log(`[NavigationTracker] Saving results to: ${filePath}`);
      
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      console.log('[NavigationTracker] Results saved successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[NavigationTracker] Error in saveResults:', errorMsg);
      
      // Try one more time with a simpler approach
      try {
        const simpleResult = {
          spec_file: this.specFile,
          navigations: this.navigations,
          timestamp: new Date().toISOString()
        };
        
        if (!fs.existsSync(this.resultsDir)) {
          fs.mkdirSync(this.resultsDir, { recursive: true });
        }
        
        fs.writeFileSync(
          path.join(this.resultsDir, 'navigation-tracking-backup.json'), 
          JSON.stringify(simpleResult, null, 2)
        );
        console.log('[NavigationTracker] Backup results saved successfully');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error('[NavigationTracker] Failed to save backup results:', errorMsg);
      }
    }
  }
} 