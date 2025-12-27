import { NativeModules, Platform } from 'react-native';

/**
 * JSBridge for native communication
 */
const JSBridge = {
  /**
   * Call a native method with optional parameters
   */
  callNative: async (
    moduleName: string,
    methodName: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> => {
    const nativeModule = NativeModules[moduleName];
    if (!nativeModule) {
      console.warn(`Native module "${moduleName}" not found`);
      return null;
    }
    if (typeof nativeModule[methodName] !== 'function') {
      console.warn(`Method "${methodName}" not found in module "${moduleName}"`);
      return null;
    }
    return nativeModule[methodName](params);
  },

  /**
   * Get device info from native side
   */
  getDeviceInfo: (): { platform: string; version: string | number } => {
    return {
      platform: Platform.OS,
      version: Platform.Version,
    };
  },

  /**
   * Send event/data to native side
   */
  postMessage: async (
    eventName: string,
    data?: Record<string, unknown>,
  ): Promise<void> => {
    const bridgeModule = NativeModules.JSBridgeModule;
    if (bridgeModule?.postMessage) {
      await bridgeModule.postMessage(eventName, data);
    } else {
      console.log(`[JSBridge] ${eventName}:`, data);
    }
  },
};

export { JSBridge };
