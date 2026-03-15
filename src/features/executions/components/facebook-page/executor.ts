import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { facebookPageChannel } from "@/inngest/channels/facebook-page";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type FacebookPageData = {
  variableName?: string;
  credentialId?: string;
  pageId?: string;
  message?: string;
  link?: string;
};

export const facebookPageExecutor: NodeExecutor<FacebookPageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(facebookPageChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Facebook Page node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Facebook Page node: Credential is required");
  }
  if (!data.pageId) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Facebook Page node: Page ID is required");
  }
  if (!data.message) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Facebook Page node: Message is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Facebook Page node: Credential not found");
  }

  const accessToken = decrypt(credential.value);
  const message = decode(Handlebars.compile(data.message)(context));
  const link = data.link ? decode(Handlebars.compile(data.link)(context)) : undefined;

  try {
    const result = await step.run("facebook-page-post", async () => {
      const body: Record<string, string> = { message };
      if (link) body.link = link;

      const response = await ky
        .post(`https://graph.facebook.com/v19.0/${data.pageId}/feed`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: body,
        })
        .json<{ id: string }>();

      return {
        ...context,
        [data.variableName!]: { postId: response.id, pageId: data.pageId, message },
      };
    });

    await publish(facebookPageChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
