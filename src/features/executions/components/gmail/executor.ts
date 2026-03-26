import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailChannel } from "@/inngest/channels/gmail";
import {
  getGoogleAccessToken,
  loadGoogleRefreshToken,
} from "@/integrations/google/auth";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type GmailData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  subject?: string;
  body?: string;
};

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(gmailChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Credential is required");
  }
  if (!data.to) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Recipient (to) is required");
  }
  if (!data.subject) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Subject is required");
  }

  const refreshToken = await loadGoogleRefreshToken({
    credentialId: data.credentialId,
    userId,
    step,
    nodeName: "Gmail node",
  });
  const variableName = data.variableName;
  const to = decode(Handlebars.compile(data.to)(context));
  const subject = decode(Handlebars.compile(data.subject)(context));
  const bodyText = data.body
    ? decode(Handlebars.compile(data.body)(context))
    : "";

  try {
    const result = await step.run("gmail-send", async () => {
      const accessToken = await getGoogleAccessToken(refreshToken);

      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        bodyText,
      ];
      const raw = Buffer.from(emailLines.join("\r\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await ky
        .post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { raw },
        })
        .json<{ id: string; threadId: string }>();

      return {
        ...context,
        [variableName]: {
          messageId: response.id,
          threadId: response.threadId,
          to,
          subject,
        },
      };
    });

    await publish(gmailChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
