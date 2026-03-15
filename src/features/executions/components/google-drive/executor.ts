import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type GoogleDriveData = {
  variableName?: string;
  credentialId?: string;
  action?: "list" | "create_folder";
  folderId?: string;
  folderName?: string;
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

export const googleDriveExecutor: NodeExecutor<GoogleDriveData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(googleDriveChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Drive node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Drive node: Credential is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Drive node: Credential not found");
  }

  const refreshToken = decrypt(credential.value);
  const action = data.action ?? "list";

  try {
    const result = await step.run("google-drive-action", async () => {
      const accessToken = await getAccessToken(refreshToken);

      if (action === "list") {
        const folderId = data.folderId ? decode(Handlebars.compile(data.folderId)(context)) : "root";
        const query = `'${folderId}' in parents and trashed = false`;
        const response = await ky
          .get(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,createdTime)`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{ files: Array<{ id: string; name: string; mimeType: string; webViewLink: string }> }>();

        return { ...context, [data.variableName!]: { files: response.files } };
      }

      // create_folder
      const folderName = data.folderName
        ? decode(Handlebars.compile(data.folderName)(context))
        : "New Folder";
      const body: Record<string, unknown> = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };
      if (data.folderId) {
        body.parents = [decode(Handlebars.compile(data.folderId)(context))];
      }

      const folder = await ky
        .post("https://www.googleapis.com/drive/v3/files", {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: body,
        })
        .json<{ id: string; name: string; webViewLink: string }>();

      return {
        ...context,
        [data.variableName!]: { folderId: folder.id, name: folder.name, webViewLink: folder.webViewLink },
      };
    });

    await publish(googleDriveChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
