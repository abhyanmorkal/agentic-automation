type TriggerTokenPayload = {
  workflowId: string;
  nodeId: string;
};

export const encodeTriggerToken = ({
  workflowId,
  nodeId,
}: TriggerTokenPayload) =>
  Buffer.from(JSON.stringify({ workflowId, nodeId }), "utf8").toString(
    "base64url",
  );

export const decodeTriggerToken = (
  rawToken: string,
): TriggerTokenPayload | null => {
  try {
    const normalized = rawToken.endsWith("_pc")
      ? rawToken.slice(0, -3)
      : rawToken;
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const payload = decoded.startsWith("{")
      ? decoded
      : decodeURIComponent(decoded);
    const parsed = JSON.parse(payload) as Partial<TriggerTokenPayload>;

    if (!parsed.workflowId || !parsed.nodeId) {
      return null;
    }

    return {
      workflowId: parsed.workflowId,
      nodeId: parsed.nodeId,
    };
  } catch {
    return null;
  }
};
