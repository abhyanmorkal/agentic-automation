import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";

const RETRY_DELAY_MS = 15000;

interface UseNodeStatusOptions {
  nodeId: string;
  channel: string;
  topic: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token | null>;
}

export function useNodeStatus({
  nodeId,
  channel,
  topic,
  refreshToken,
}: UseNodeStatusOptions) {
  const [status, setStatus] = useState<NodeStatus>("initial");
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap refreshToken to catch 401/connection errors and auto-retry after a delay
  const safeRefreshToken = useCallback(async () => {
    try {
      const token = await refreshToken();
      if (!token) {
        setRealtimeEnabled(false);
        retryTimerRef.current = setTimeout(
          () => setRealtimeEnabled(true),
          RETRY_DELAY_MS,
        );
        return new Promise<Realtime.Subscribe.Token>(() => {});
      }
      return token;
    } catch {
      setRealtimeEnabled(false);
      retryTimerRef.current = setTimeout(
        () => setRealtimeEnabled(true),
        RETRY_DELAY_MS,
      );
      return new Promise<Realtime.Subscribe.Token>(() => {});
    }
  }, [refreshToken]);

  // Clear the retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const { data } = useInngestSubscription({
    refreshToken: safeRefreshToken as () => Promise<Realtime.Subscribe.Token>,
    enabled: realtimeEnabled,
  });

  useEffect(() => {
    if (!data?.length) {
      return;
    }

    const latestMessage = data
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.channel === channel &&
          msg.topic === topic &&
          msg.data.nodeId === nodeId,
      )
      .sort((a, b) => {
        if (a.kind === "data" && b.kind === "data") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return 0;
      })[0];

    if (latestMessage?.kind === "data") {
      setStatus(latestMessage.data.status as NodeStatus);
    }
  }, [data, nodeId, channel, topic]);

  return status;
}
