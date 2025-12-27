/**
 * JSBridge SDK for WebView pages
 * Include this script in your web page to communicate with React Native
 * 
 * Usage:
 *   <script src="jsbridge.js"></script>
 *   <script>
 *     window.addEventListener('JSBridgeReady', function() {
 *       JSBridge.call('getUserInfo').then(function(user) {
 *         console.log(user);
 *       });
 *     });
 *   </script>
 */
(function(global) {
  if (global.JSBridge) return;

  var callbackId = 0;
  var callbacks = {};

  var JSBridge = {
    /**
     * Call native method and wait for response
     * @param {string} type - Method name
     * @param {*} data - Parameters
     * @returns {Promise<*>}
     */
    call: function(type, data) {
      return new Promise(function(resolve, reject) {
        if (!global.ReactNativeWebView) {
          reject(new Error('Not in React Native WebView'));
          return;
        }
        var id = ++callbackId;
        callbacks[id] = { resolve: resolve, reject: reject };
        global.ReactNativeWebView.postMessage(JSON.stringify({
          id: id,
          type: type,
          data: data
        }));
        // Timeout
        setTimeout(function() {
          if (callbacks[id]) {
            callbacks[id].reject(new Error('JSBridge call timeout'));
            delete callbacks[id];
          }
        }, 30000);
      });
    },

    /**
     * Send event to native (fire and forget)
     * @param {string} type - Event name
     * @param {*} data - Event data
     */
    emit: function(type, data) {
      if (global.ReactNativeWebView) {
        global.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          data: data
        }));
      }
    },

    /**
     * Check if running in RN WebView
     * @returns {boolean}
     */
    isInApp: function() {
      return !!global.ReactNativeWebView;
    },

    /**
     * Internal: called by RN to resolve/reject promises
     */
    _callback: function(id, error, result) {
      if (callbacks[id]) {
        if (error) {
          callbacks[id].reject(new Error(error));
        } else {
          callbacks[id].resolve(result);
        }
        delete callbacks[id];
      }
    },

    /**
     * Internal: called by RN to push events to web
     */
    _receive: function(type, data) {
      if (JSBridge.onMessage) {
        JSBridge.onMessage(type, data);
      }
    },

    /**
     * Override this to receive messages from RN
     * @param {string} type
     * @param {*} data
     */
    onMessage: null
  };

  global.JSBridge = JSBridge;
  
  // Dispatch ready event
  if (typeof Event === 'function') {
    global.dispatchEvent(new Event('JSBridgeReady'));
  }
})(typeof window !== 'undefined' ? window : this);
