import MsgType from "@constants/messageTypes";
import { useEffect, useRef, useState } from "react";
import useWebviewApiOnMessage from "./useWebViewApiOnMessage";

let settingsSnapshot: Record<string, any> | null = null;
let settingsSnapshotPromise: Promise<Record<string, any>> | null = null;

/**
 * Load all settings once and share the result between hooks.
 *
 * This keeps the first render free of note searches and avoids sending a
 * "trigger everything" message from every settings hook.
 */
function loadSettingsSnapshot(): Promise<Record<string, any>> {
  if (!settingsSnapshotPromise) {
    settingsSnapshotPromise = webviewApi
      .postMessage({ type: MsgType.GetSettings })
      .then((settings: Record<string, any>) => {
        settingsSnapshot = settings ?? {};
        return settingsSnapshot;
      })
      .catch((error) => {
        console.error("Failed to load calendar settings", error);
        settingsSnapshotPromise = null;
        return {};
      });
  }

  return settingsSnapshotPromise;
}

/**
 * Provides the settings value for the given settings key.
 *
 * @template SettingType The type of the settings value
 *
 * @param settingKey The settings key
 * @param defaultValue The value to use until the settings snapshot arrives
 * @returns The settings value
 */
function useOnSettingsChange<SettingType>(
  settingKey: string,
  defaultValue: SettingType = null
): SettingType {
  const [settingValue, setSettingValue] = useState<SettingType>(() => {
    if (settingsSnapshot && settingKey in settingsSnapshot) {
      return settingsSnapshot[settingKey];
    }
    return defaultValue;
  });
  const receivedLiveUpdate = useRef(false);

  useWebviewApiOnMessage((data) => {
    const message = data.message as any;

    if (!message.type) {
      return;
    }
    if (message.type !== MsgType.SettingChanged) {
      return;
    }
    if (message.key !== settingKey) {
      return;
    }
    receivedLiveUpdate.current = true;
    setSettingValue(message.value);
  });

  useEffect(() => {
    let active = true;

    loadSettingsSnapshot().then((snapshot) => {
      if (active && !receivedLiveUpdate.current && settingKey in snapshot) {
        setSettingValue(snapshot[settingKey]);
      }
    });

    return () => {
      active = false;
    };
  }, [settingKey]);

  return settingValue;
}

export default useOnSettingsChange;
