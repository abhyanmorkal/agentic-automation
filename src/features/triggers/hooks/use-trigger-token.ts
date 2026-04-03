"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export const useTriggerToken = (nodeId: string) => {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadToken = async () => {
      if (!workflowId || !nodeId) {
        setToken(null);
        return;
      }

      try {
        const response = await fetch("/api/triggers/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowId, nodeId }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate trigger token");
        }

        const body = (await response.json()) as { token?: string };

        if (!cancelled) {
          setToken(body.token ?? null);
        }
      } catch {
        if (!cancelled) {
          setToken(null);
        }
      }
    };

    loadToken();

    return () => {
      cancelled = true;
    };
  }, [nodeId, workflowId]);

  return useMemo(
    () => ({
      workflowId,
      token,
      ready: Boolean(token),
    }),
    [token, workflowId],
  );
};
