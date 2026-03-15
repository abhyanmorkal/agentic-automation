import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type GoogleSheetsData = {
  variableName?: string;
  credentialId?: string;
  spreadsheetId?: string;
  range?: string;
  values?: string;
  action?: "append" | "read";
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

export const googleSheetsExecutor: NodeExecutor<GoogleSheetsData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(googleSheetsChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Sheets node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Sheets node: Credential is required");
  }
  if (!data.spreadsheetId) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Sheets node: Spreadsheet ID is required");
  }
  if (!data.range) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Sheets node: Range is required (e.g. Sheet1!A:Z)");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Sheets node: Credential not found");
  }

  const refreshToken = decrypt(credential.value);
  const action = data.action ?? "append";
  const spreadsheetId = data.spreadsheetId;
  const range = decode(Handlebars.compile(data.range)(context));

  try {
    const result = await step.run("google-sheets-action", async () => {
      const accessToken = await getAccessToken(refreshToken);

      if (action === "read") {
        const response = await ky
          .get(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{ values: string[][] }>();

        return {
          ...context,
          [data.variableName!]: { values: response.values ?? [], range },
        };
      }

      // Append
      let parsedValues: string[][] = [[]];
      if (data.values) {
        const resolvedValues = decode(Handlebars.compile(data.values)(context));
        try {
          parsedValues = JSON.parse(resolvedValues);
        } catch {
          throw new NonRetriableError("Google Sheets node: Values must be a valid JSON 2D array");
        }
      }

      const response = await ky
        .post(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            json: { values: parsedValues },
          },
        )
        .json<{ updates: { updatedRange: string; updatedRows: number } }>();

      return {
        ...context,
        [data.variableName!]: {
          updatedRange: response.updates.updatedRange,
          updatedRows: response.updates.updatedRows,
        },
      };
    });

    await publish(googleSheetsChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
