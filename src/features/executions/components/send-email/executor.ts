import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { sendEmailChannel } from "@/inngest/channels/send-email";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type SendEmailData = {
  variableName?: string;
  credentialId?: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
};

export const sendEmailExecutor: NodeExecutor<SendEmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(sendEmailChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Credential is required");
  }
  if (!data.to) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Recipient (to) is required");
  }
  if (!data.subject) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Subject is required");
  }
  if (!data.body) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Body is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Send Email node: Credential not found");
  }

  const apiKey = decrypt(credential.value);
  const to = decode(Handlebars.compile(data.to)(context));
  const subject = decode(Handlebars.compile(data.subject)(context));
  const html = decode(Handlebars.compile(data.body)(context));
  const from = data.from || "noreply@resend.dev";

  try {
    const result = await step.run("send-email-resend", async () => {
      const response = await ky
        .post("https://api.resend.com/emails", {
          headers: { Authorization: `Bearer ${apiKey}` },
          json: { from, to, subject, html },
        })
        .json<{ id: string }>();

      return {
        ...context,
        [data.variableName!]: { emailId: response.id, to, subject },
      };
    });

    await publish(sendEmailChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
