import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { sendSmsChannel } from "@/inngest/channels/send-sms";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type SendSmsData = {
  variableName?: string;
  credentialId?: string;
  from?: string;
  to?: string;
  message?: string;
};

export const sendSmsExecutor: NodeExecutor<SendSmsData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(sendSmsChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send SMS node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send SMS node: Credential is required");
  }
  if (!data.to) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send SMS node: Recipient phone number is required");
  }
  if (!data.message) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send SMS node: Message is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send SMS node: Credential not found");
  }

  // Credential value format: "accountSid:authToken"
  const [accountSid, authToken] = decrypt(credential.value).split(":");
  if (!accountSid || !authToken) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Send SMS node: Invalid credential format — expected 'accountSid:authToken'",
    );
  }

  const to = decode(Handlebars.compile(data.to)(context));
  const body = decode(Handlebars.compile(data.message)(context));
  const from = data.from || "";

  try {
    const result = await step.run("twilio-send-sms", async () => {
      const params = new URLSearchParams({ To: to, From: from, Body: body });
      const response = await ky
        .post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          },
        )
        .json<{ sid: string; status: string; to: string }>();

      return {
        ...context,
        [data.variableName!]: { messageSid: response.sid, status: response.status, to: response.to },
      };
    });

    await publish(sendSmsChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
