import MonthStatistics from "@constants/MonthStatistics";
import NoteSearchTypes from "@constants/NoteSearchTypes";
import MsgType from "@constants/messageTypes";
import { useQuery } from "@tanstack/react-query";
import { Moment } from "moment";
import useSelectedNote from "./useSelectedNote";
import { useEffect, useState } from "react";
import useWebviewApiOnMessage from "./useWebViewApiOnMessage";

interface UseGetMonthStatisticsOptions {
  enabled?: boolean;
}

function useGetMonthStatistics(
  month: Moment,
  noteSearchTypes: NoteSearchTypes[],
  { enabled = true }: UseGetMonthStatisticsOptions = {}
) {
  const { data, refetch } = useQuery<MonthStatistics>({
    queryKey: ["monthStatistics", month.format("MMYYYY")],
    queryFn: async () => {
      return await webviewApi.postMessage({
        type: MsgType.GetMonthStatistics,
        date: month.toISOString(),
        noteSearchTypes: noteSearchTypes,
      });
    },
    enabled,
  });

  const { selectedNote } = useSelectedNote({ enabled });
  const [currentParentId, setCurrentParentId] = useState("");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // If selected notebook changes, fetch statistics again.
    if (selectedNote && selectedNote.parent_id != currentParentId) {
      setCurrentParentId(selectedNote.parent_id);
      refetch();
    }
  });

  useWebviewApiOnMessage((data) => {
    if (!enabled) {
      return;
    }

    const message = data.message;
    if (message.type === MsgType.SettingChanged) {
      refetch();
    }
  });

  return { data, refetch };
}

export default useGetMonthStatistics;
