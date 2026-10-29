import { PluginPostMessage } from "@constants/pluginMessageTypes";
import { useEffect, useRef } from "react";

type MessageListener = (message: PluginPostMessage) => void;

const listeners = new Set<MessageListener>();
let dispatcherRegistered = false;

function dispatch(message: PluginPostMessage) {
  listeners.forEach((listener) => listener(message));
}

function ensureDispatcher() {
  if (dispatcherRegistered) {
    return;
  }
  dispatcherRegistered = true;
  webviewApi.onMessage(dispatch);
}

/**
 * Reset the module-level dispatcher. Only used by tests.
 */
export function resetWebviewApiMessageDispatcherForTests() {
  listeners.clear();
  dispatcherRegistered = false;
}

/**
 * Subscribe to messages sent by the plugin backend.
 *
 * A single transport listener is registered for the whole webview, instead of
 * registering a new `webviewApi.onMessage` listener on every render.
 */
function useWebviewApiOnMessage(cb: MessageListener) {
  const callbackRef = useRef(cb);
  callbackRef.current = cb;

  useEffect(() => {
    ensureDispatcher();

    const listener: MessageListener = (message) => callbackRef.current(message);

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

export default useWebviewApiOnMessage;
