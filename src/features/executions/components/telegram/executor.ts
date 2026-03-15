import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { telegramChannel } from "@/inngest/channels/telegram";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type TelegramData = {
  variableName?: string;
  credentialId?: string;
  chatId?: string;
  message?: string;
};

export const telegramExecutor: NodeExecutor<TelegramData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(telegramChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Telegram node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Telegram node: Credential is required");
  }
  if (!data.chatId) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Telegram node: Chat ID is required");
  }
  if (!data.message) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Telegram node: Message is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Telegram node: Credential not found");
  }

  const botToken = decrypt(credential.value);
  const rawMessage = Handlebars.compile(data.message)(context);
  const message = decode(rawMessage);
  const chatId = Handlebars.compile(data.chatId)(context);

  try {
    const result = await step.run("telegram-send-message", async () => {
      const response = await ky
        .post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          json: { chat_id: chatId, text: message, parse_mode: "Markdown" },
        })
        .json<{ ok: boolean; result: { message_id: number } }>();

      return {
        ...context,
        [data.variableName!]: {
          messageId: response.result.message_id,
          chatId,
          text: message,
        },
      };
    });

    await publish(telegramChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(telegramChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
