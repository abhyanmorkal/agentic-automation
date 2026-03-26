import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { instagramChannel } from "@/inngest/channels/instagram";
import { getMetaGraphUrl, loadMetaAccessToken } from "@/integrations/meta/auth";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type InstagramData = {
  variableName?: string;
  credentialId?: string;
  igUserId?: string;
  imageUrl?: string;
  caption?: string;
};

export const instagramExecutor: NodeExecutor<InstagramData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(instagramChannel().status({ nodeId, status: "loading" }));

  const variableName = data.variableName;
  if (!variableName) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Credential is required");
  }
  if (!data.igUserId) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Instagram node: Instagram User ID is required",
    );
  }
  if (!data.imageUrl) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Image URL is required");
  }

  const accessToken = await loadMetaAccessToken({
    credentialId: data.credentialId,
    userId,
    step,
    nodeName: "Instagram node",
  });
  const imageUrl = decode(Handlebars.compile(data.imageUrl)(context));
  const caption = data.caption
    ? decode(Handlebars.compile(data.caption)(context))
    : "";

  try {
    const result = await step.run("instagram-publish-post", async () => {
      const container = await ky
        .post(getMetaGraphUrl(`${data.igUserId}/media`), {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { image_url: imageUrl, caption },
        })
        .json<{ id: string }>();

      const published = await ky
        .post(getMetaGraphUrl(`${data.igUserId}/media_publish`), {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { creation_id: container.id },
        })
        .json<{ id: string }>();

      return {
        ...context,
        [variableName]: { postId: published.id, imageUrl, caption },
      };
    });

    await publish(instagramChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
