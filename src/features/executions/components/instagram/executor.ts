import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { instagramChannel } from "@/inngest/channels/instagram";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

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

  if (!data.variableName) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Credential is required");
  }
  if (!data.igUserId) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Instagram User ID is required");
  }
  if (!data.imageUrl) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Image URL is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Instagram node: Credential not found");
  }

  const accessToken = decrypt(credential.value);
  const imageUrl = decode(Handlebars.compile(data.imageUrl)(context));
  const caption = data.caption ? decode(Handlebars.compile(data.caption)(context)) : "";

  try {
    const result = await step.run("instagram-publish-post", async () => {
      // Step 1: Create media container
      const container = await ky
        .post(`https://graph.facebook.com/v19.0/${data.igUserId}/media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { image_url: imageUrl, caption },
        })
        .json<{ id: string }>();

      // Step 2: Publish the container
      const published = await ky
        .post(`https://graph.facebook.com/v19.0/${data.igUserId}/media_publish`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { creation_id: container.id },
        })
        .json<{ id: string }>();

      return {
        ...context,
        [data.variableName!]: { postId: published.id, imageUrl, caption },
      };
    });

    await publish(instagramChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(instagramChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
