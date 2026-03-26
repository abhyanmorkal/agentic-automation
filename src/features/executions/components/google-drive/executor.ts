import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import {
  getGoogleAccessToken,
  loadGoogleRefreshToken,
} from "@/integrations/google/auth";

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

  const refreshToken = await loadGoogleRefreshToken({
    credentialId: data.credentialId,
    userId,
    step,
    nodeName: "Google Drive node",
  });
  const variableName = data.variableName;
  const action = data.action ?? "list";

  try {
    const result = await step.run("google-drive-action", async () => {
      const accessToken = await getGoogleAccessToken(refreshToken);

      if (action === "list") {
        const folderId = data.folderId
          ? decode(Handlebars.compile(data.folderId)(context))
          : "root";
        const query = `'${folderId}' in parents and trashed = false`;
        const response = await ky
          .get(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,createdTime)`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{
            files: Array<{
              id: string;
              name: string;
              mimeType: string;
              webViewLink: string;
            }>;
          }>();

        return { ...context, [variableName]: { files: response.files } };
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
        [variableName]: {
          folderId: folder.id,
          name: folder.name,
          webViewLink: folder.webViewLink,
        },
      };
    });

    await publish(googleDriveChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
