import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type WhatsAppData = {
  variableName?: string;
  credentialId?: string;
  phoneNumberId?: string;
  to?: string;
  message?: string;
};

export const whatsappExecutor: NodeExecutor<WhatsAppData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(whatsappChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Credential is required");
  }
  if (!data.phoneNumberId) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Phone Number ID is required");
  }
  if (!data.to) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Recipient phone number is required");
  }
  if (!data.message) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Message is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Credential not found");
  }

  const accessToken = decrypt(credential.value);
  const to = decode(Handlebars.compile(data.to)(context));
  const message = decode(Handlebars.compile(data.message)(context));

  try {
    const result = await step.run("whatsapp-send-message", async () => {
      const response = await ky
        .post(
          `https://graph.facebook.com/v19.0/${data.phoneNumberId}/messages`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            json: {
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { preview_url: false, body: message },
            },
          },
        )
        .json<{ messages: Array<{ id: string }> }>();

      return {
        ...context,
        [data.variableName!]: { messageId: response.messages[0]?.id, to, message },
      };
    });

    await publish(whatsappChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
