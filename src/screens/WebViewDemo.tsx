import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { WebViewBridge, WebViewBridgeRef } from '../utils/WebViewBridge';

// Demo HTML page with JSBridge usage
const DEMO_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
    button { padding: 12px 20px; margin: 8px 0; width: 100%; font-size: 16px; border: none; border-radius: 8px; background: #007AFF; color: white; }
    button:active { opacity: 0.8; }
    .result { padding: 12px; background: #fff; border-radius: 8px; margin: 8px 0; word-break: break-all; }
    h3 { color: #333; }
  </style>
</head>
<body>
  <h3>WebView JSBridge Demo</h3>
  
  <button onclick="getUserInfo()">Call: getUserInfo</button>
  <button onclick="getDeviceInfo()">Call: getDeviceInfo</button>
  <button onclick="showNativeAlert()">Call: showAlert</button>
  <button onclick="sendEvent()">Emit: pageEvent</button>
  
  <h3>Result:</h3>
  <div id="result" class="result">Waiting...</div>
  
  <h3>Messages from RN:</h3>
  <div id="messages" class="result">None yet</div>

  <script>
    function log(msg) {
      document.getElementById('result').innerText = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
    }

    async function getUserInfo() {
      try {
        const user = await JSBridge.call('getUserInfo');
        log(user);
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    async function getDeviceInfo() {
      try {
        const info = await JSBridge.call('getDeviceInfo');
        log(info);
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    async function showNativeAlert() {
      try {
        const result = await JSBridge.call('showAlert', { title: 'Hello', message: 'From WebView!' });
        log('Alert result: ' + result);
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    function sendEvent() {
      JSBridge.emit('pageEvent', { action: 'buttonClick', timestamp: Date.now() });
      log('Event sent!');
    }

    // Listen for messages from RN
    JSBridge.onMessage = function(type, data) {
      document.getElementById('messages').innerText = type + ': ' + JSON.stringify(data);
      console.log('type', type)
    };

    log('JSBridge ready! isInApp: ' + JSBridge.isInApp());
  </script>
</body>
</html>
`;

export function WebViewDemo() {
  const bridgeRef = useRef<WebViewBridgeRef>(null);

  // Define handlers that web page can call
  const handlers = {
    getUserInfo: async () => {
      return { id: 1, name: 'John Doe', email: 'john@example.com' };
    },

    getDeviceInfo: async () => {
      return { platform: 'React Native', version: '0.70+' };
    },

    showAlert: async (data: unknown) => {
      const { title, message } = (data || {}) as { title?: string; message?: string };
      return new Promise(resolve => {
        Alert.alert(title || 'Alert', message || '', [
          { text: 'OK', onPress: () => resolve('confirmed') },
        ]);
      });
    },
  };

  // Handle events from web page
  const handleMessage = (event: { type: string; data: unknown }) => {
    console.log('Event from WebView:', event.type, event.data);
  };

  // Send message to web page
  const sendToWeb = () => {
    bridgeRef.current?.postMessage('fromNative', {
      greeting: 'Hello from React Native!',
      time: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonBar}>
        <TouchableOpacity style={styles.button} onPress={sendToWeb}>
          <Text style={styles.buttonText}>Send Message to WebView</Text>
        </TouchableOpacity>
      </View>
      <WebViewBridge
        ref={bridgeRef}
        source={{ html: DEMO_HTML }}
        handlers={handlers}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonBar: {
    padding: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
});
