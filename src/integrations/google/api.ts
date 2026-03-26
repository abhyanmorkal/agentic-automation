import ky from "ky";
import { CredentialType } from "@/generated/prisma";
import {
  getDecryptedCredentialValue,
  loadCredentialForUser,
} from "../core/credentials";
import { getGoogleAccessToken } from "./auth";

type GoogleCredentialContext = {
  credentialId: string;
  userId: string;
};

type GoogleSpreadsheet = {
  id: string;
  name: string;
};

type GoogleSheet = {
  title: string;
};

const getGoogleAccessTokenForUser = async ({
  credentialId,
  userId,
}: GoogleCredentialContext) => {
  const credential = await loadCredentialForUser({
    credentialId,
    userId,
    expectedType: CredentialType.GOOGLE_OAUTH,
  });

  const refreshToken = getDecryptedCredentialValue(credential);
  return getGoogleAccessToken(refreshToken);
};

export const testGoogleConnection = async ({
  credentialId,
  userId,
}: GoogleCredentialContext) => {
  const accessToken = await getGoogleAccessTokenForUser({
    credentialId,
    userId,
  });

  return ky
    .get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .json<{ email?: string; name?: string }>();
};

export const fetchGoogleSpreadsheetsForUser = async ({
  credentialId,
  userId,
}: GoogleCredentialContext): Promise<GoogleSpreadsheet[]> => {
  const accessToken = await getGoogleAccessTokenForUser({
    credentialId,
    userId,
  });
  const allFiles: GoogleSpreadsheet[] = [];
  let pageToken: string | undefined;

  do {
    const res = await ky
      .get("https://www.googleapis.com/drive/v3/files", {
        searchParams: {
          q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed = false",
          fields: "nextPageToken, files(id,name)",
          pageSize: "1000",
          spaces: "drive",
          includeItemsFromAllDrives: "true",
          supportsAllDrives: "true",
          ...(pageToken ? { pageToken } : {}),
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .json<{ nextPageToken?: string; files?: GoogleSpreadsheet[] }>();

    if (res.files?.length) {
      allFiles.push(...res.files);
    }

    pageToken = res.nextPageToken;
  } while (pageToken);

  return allFiles;
};

export const fetchGoogleSheetsForUser = async ({
  credentialId,
  userId,
  spreadsheetId,
}: GoogleCredentialContext & {
  spreadsheetId: string;
}): Promise<GoogleSheet[]> => {
  const accessToken = await getGoogleAccessTokenForUser({
    credentialId,
    userId,
  });

  const res = await ky
    .get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      searchParams: { fields: "sheets(properties(title))" },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .json<{ sheets?: { properties?: { title?: string } }[] }>()
    .catch(() => ({ sheets: [] }));

  return (res.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title))
    .map((title) => ({ title }));
};

export const fetchGoogleSheetColumnsForUser = async ({
  credentialId,
  userId,
  spreadsheetId,
  sheetTitle,
}: GoogleCredentialContext & {
  spreadsheetId: string;
  sheetTitle: string;
}): Promise<string[]> => {
  const accessToken = await getGoogleAccessTokenForUser({
    credentialId,
    userId,
  });

  const res = await ky
    .get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        `${sheetTitle}!1:1`,
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
    .json<{ values?: string[][] }>()
    .catch(() => ({ values: [] }));

  const firstRow = (res.values ?? [])[0] ?? [];
  return firstRow.filter((value) => value && value.trim().length > 0);
};
