"use server";

import { type Realtime } from "@inngest/realtime";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { safeGetToken } from "@/inngest/get-token";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";
import { refreshAccessToken } from "@/lib/google-oauth";

export type GoogleSheetsToken = Realtime.Token<typeof googleSheetsChannel, ["status"]>;

export async function fetchGoogleSheetsRealtimeToken(): Promise<GoogleSheetsToken | null> {
  return safeGetToken(googleSheetsChannel(), ["status"]) as Promise<GoogleSheetsToken | null>;
}

type GoogleSpreadsheet = {
  id: string;
  name: string;
};

type GoogleSheet = {
  title: string;
};

export async function fetchGoogleSpreadsheets(credentialId: string): Promise<GoogleSpreadsheet[]> {
  const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!credential) return [];

  const refreshToken = decrypt(credential.value);
  const accessToken = await refreshAccessToken(refreshToken);

  const allFiles: { id: string; name: string }[] = [];
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
      .json<{ nextPageToken?: string; files?: { id: string; name: string }[] }>();

    if (res.files && res.files.length > 0) {
      allFiles.push(...res.files);
    }

    pageToken = res.nextPageToken;
  } while (pageToken);

  return allFiles.map((f) => ({ id: f.id, name: f.name }));
}

export async function fetchGoogleSheets(credentialId: string, spreadsheetId: string): Promise<GoogleSheet[]> {
  const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!credential) return [];

  const refreshToken = decrypt(credential.value);
  const accessToken = await refreshAccessToken(refreshToken);

  const res = await ky
    .get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      searchParams: { fields: "sheets(properties(title))" },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .json<{ sheets?: { properties?: { title?: string } }[] }>()
    .catch(() => ({ sheets: [] }));

  return (res.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t))
    .map((title) => ({ title }));
}

export async function fetchGoogleSheetColumns(
  credentialId: string,
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[]> {
  const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!credential) return [];

  const refreshToken = decrypt(credential.value);
  const accessToken = await refreshAccessToken(refreshToken);

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
  return firstRow.filter((v) => v && v.trim().length > 0);
}
