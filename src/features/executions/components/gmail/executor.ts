import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailChannel } from "@/inngest/channels/gmail";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

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

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await ky
    .post("https://oauth2.googleapis.com/token", {
      json: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
    })
    .json<{ access_token: string }>();
  return res.access_token;
}

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

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Credential not found");
  }

  const refreshToken = decrypt(credential.value);
  const to = decode(Handlebars.compile(data.to)(context));
  const subject = decode(Handlebars.compile(data.subject)(context));
  const bodyText = data.body ? decode(Handlebars.compile(data.body)(context)) : "";

  try {
    const result = await step.run("gmail-send", async () => {
      const accessToken = await getAccessToken(refreshToken);

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
        .post(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            json: { raw },
          },
        )
        .json<{ id: string; threadId: string }>();

      return {
        ...context,
        [data.variableName!]: { messageId: response.id, threadId: response.threadId, to, subject },
      };
    });

    await publish(gmailChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
