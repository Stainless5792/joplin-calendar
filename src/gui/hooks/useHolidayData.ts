import { useEffect, useMemo, useState } from "react";
import MsgType from "@constants/messageTypes";
import { CN_HOLIDAY_FILE, CN_HOLIDAY_FILE_CACHE } from "@constants/Settings";
import useOnSettingsChange from "./useOnSettingsChange";
import useWebviewApiOnMessage from "./useWebViewApiOnMessage";
import { createHolidayLookup, type CnHolidayLookup } from "../holidays";
import { parseHolidayCache } from "../holidays/parse";
import {
  buildHolidayRuntimeData,
  type HolidayOrigin,
} from "../holidays/runtime";

export interface HolidayData {
  lookup: CnHolidayLookup;
  years: number[];
  origin: HolidayOrigin;
}

/**
 * Load holiday data from the bundled data set and an optional imported file.
 *
 * No network requests are made.
 */
export default function useHolidayData(): HolidayData {
  const fileCacheFromSettings = useOnSettingsChange<string>(
    CN_HOLIDAY_FILE_CACHE,
    ""
  );
  const [fileCacheRaw, setFileCacheRaw] = useState(fileCacheFromSettings ?? "");

  useEffect(() => {
    setFileCacheRaw(fileCacheFromSettings ?? "");
  }, [fileCacheFromSettings]);

  // The backend re-imports the file on change; pull the new cache.
  useWebviewApiOnMessage((data) => {
    const message = data.message as { type?: MsgType; key?: string };

    if (
      message.type === MsgType.SettingChanged &&
      message.key === CN_HOLIDAY_FILE
    ) {
      webviewApi
        .postMessage({ type: MsgType.GetHolidayData })
        .then((data) => setFileCacheRaw(data?.fileCache ?? ""))
        .catch(() => undefined);
    }
  });

  const fileCache = useMemo(
    () => parseHolidayCache(fileCacheRaw),
    [fileCacheRaw]
  );

  const data = useMemo(() => {
    const runtime = buildHolidayRuntimeData(fileCache);
    return {
      ...runtime,
      lookup: createHolidayLookup(runtime.days),
    };
  }, [fileCache]);

  return {
    lookup: data.lookup,
    years: data.years,
    origin: data.origin,
  };
}
