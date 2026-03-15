import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { notionChannel } from "@/inngest/channels/notion";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type NotionData = {
  variableName?: string;
  credentialId?: string;
  databaseId?: string;
  title?: string;
  content?: string;
};

export const notionExecutor: NodeExecutor<NotionData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(notionChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Notion node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Notion node: Credential is required");
  }
  if (!data.databaseId) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Notion node: Database ID is required");
  }
  if (!data.title) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Notion node: Title is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Notion node: Credential not found");
  }

  const token = decrypt(credential.value);
  const title = decode(Handlebars.compile(data.title)(context));
  const content = data.content
    ? decode(Handlebars.compile(data.content)(context))
    : "";

  try {
    const result = await step.run("notion-create-page", async () => {
      const body: Record<string, unknown> = {
        parent: { database_id: data.databaseId },
        properties: {
          Name: { title: [{ text: { content: title } }] },
        },
      };

      if (content) {
        body.children = [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
            },
          },
        ];
      }

      const page = await ky
        .post("https://api.notion.com/v1/pages", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
          json: body,
        })
        .json<{ id: string; url: string }>();

      return {
        ...context,
        [data.variableName!]: { pageId: page.id, url: page.url, title },
      };
    });

    await publish(notionChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(notionChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
