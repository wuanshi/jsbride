import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type MessageHandler = (data: unknown) => unknown | Promise<unknown>;

interface WebViewBridgeProps {
  source: { uri: string } | { html: string };
  handlers?: Record<string, MessageHandler>;
  onMessage?: (event: { type: string; data: unknown }) => void;
  style?: object;
}

export interface WebViewBridgeRef {
  postMessage: (type: string, data?: unknown) => void;
}

// Injected JS SDK for web pages
const INJECTED_JSSDK = `
(function() {
  if (window.JSBridge) return;
  
  let callbackId = 0;
  const callbacks = {};
  
  window.JSBridge = {
    // Call native method and get response
    call: function(type, data) {
      return new Promise(function(resolve, reject) {
        const id = ++callbackId;
        callbacks[id] = { resolve, reject };
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: id,
          type: type,
          data: data
        }));
        // Timeout after 30s
        setTimeout(function() {
          if (callbacks[id]) {
            callbacks[id].reject(new Error('Timeout'));
            delete callbacks[id];
          }
        }, 30000);
      });
    },
    
    // Fire and forget
    emit: function(type, data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: type,
        data: data
      }));
    },
    
    // Called by RN to resolve promises
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
    
    // Called by RN to push events
    _receive: function(type, data) {
      if (window.JSBridge.onMessage) {
        window.JSBridge.onMessage(type, data);
      }
    },
    
    // User can override this
    onMessage: null
  };
  
  window.dispatchEvent(new Event('JSBridgeReady'));
})();
true;
`;

export const WebViewBridge = forwardRef<WebViewBridgeRef, WebViewBridgeProps>(
  ({ source, handlers = {}, onMessage, style }, ref) => {
    const webViewRef = useRef<WebView>(null);

    const postMessage = useCallback((type: string, data?: unknown) => {
      webViewRef.current?.injectJavaScript(
        `window.JSBridge._receive('${type}', ${JSON.stringify(data)});true;`
      );
    }, []);

    useImperativeHandle(ref, () => ({ postMessage }), [postMessage]);

    const handleMessage = useCallback(
      async (event: WebViewMessageEvent) => {
        try {
          const { id, type, data } = JSON.parse(event.nativeEvent.data);

          // If handler exists, call it and respond
          if (handlers[type]) {
            try {
              const result = await handlers[type](data);
              if (id) {
                webViewRef.current?.injectJavaScript(
                  `window.JSBridge._callback(${id}, null, ${JSON.stringify(result)});true;`
                );
              }
            } catch (err) {
              if (id) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                webViewRef.current?.injectJavaScript(
                  `window.JSBridge._callback(${id}, '${errMsg}', null);true;`
                );
              }
            }
          }

          // Notify parent
          onMessage?.({ type, data });
        } catch (e) {
          console.warn('WebViewBridge: Invalid message', e);
        }
      },
      [handlers, onMessage]
    );

    return (
      <WebView
        ref={webViewRef}
        source={source}
        style={style}
        onMessage={handleMessage}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JSSDK}
      />
    );
  }
);
