import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { facebookPageChannel } from "@/inngest/channels/facebook-page";
import { getMetaGraphUrl, loadMetaAccessToken } from "@/integrations/meta/auth";

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

  const variableName = data.variableName;
  if (!variableName) {
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

  const accessToken = await loadMetaAccessToken({
    credentialId: data.credentialId,
    userId,
    step,
    nodeName: "Facebook Page node",
  });
  const message = decode(Handlebars.compile(data.message)(context));
  const link = data.link
    ? decode(Handlebars.compile(data.link)(context))
    : undefined;

  try {
    const result = await step.run("facebook-page-post", async () => {
      const body: Record<string, string> = { message };
      if (link) body.link = link;

      const response = await ky
        .post(getMetaGraphUrl(`${data.pageId}/feed`), {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: body,
        })
        .json<{ id: string }>();

      return {
        ...context,
        [variableName]: {
          postId: response.id,
          pageId: data.pageId,
          message,
        },
      };
    });

    await publish(facebookPageChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(facebookPageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
