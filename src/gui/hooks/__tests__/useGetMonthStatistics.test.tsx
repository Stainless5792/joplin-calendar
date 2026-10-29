import React from "react";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import moment from "moment";
import MsgType from "@constants/messageTypes";
import NoteSearchTypes from "@constants/NoteSearchTypes";
import useGetMonthStatistics from "../useGetMonthStatistics";
import { resetWebviewApiMessageDispatcherForTests } from "../useWebViewApiOnMessage";

const postMessageMock = jest.fn();
const onMessageMock = jest.fn();

global.webviewApi = {
  postMessage: postMessageMock,
  onMessage: onMessageMock,
};

function TestComponent({ enabled }: { enabled: boolean }) {
  useGetMonthStatistics(moment("2026-10-29"), [NoteSearchTypes.Created], {
    enabled,
  });
  return null;
}

function renderWithQueryClient(enabled: boolean) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TestComponent enabled={enabled} />
    </QueryClientProvider>
  );
}

describe("useGetMonthStatistics", () => {
  beforeEach(() => {
    resetWebviewApiMessageDispatcherForTests();
    postMessageMock.mockReset();
    postMessageMock.mockResolvedValue({ notesPerDay: {} });
  });

  it("does not request statistics or selected note when disabled", async () => {
    renderWithQueryClient(false);

    // Let any scheduled query run.
    await Promise.resolve();

    expect(postMessageMock).not.toHaveBeenCalled();
  });

  it("requests statistics and selected note when enabled", async () => {
    renderWithQueryClient(true);

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: MsgType.GetMonthStatistics })
      );
    });

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: MsgType.GetSelectedNote })
    );
  });
});
