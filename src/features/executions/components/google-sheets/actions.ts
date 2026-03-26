"use server";

import type { Realtime } from "@inngest/realtime";
import { headers } from "next/headers";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { safeGetToken } from "@/inngest/get-token";
import {
  fetchGoogleSheetColumnsForUser,
  fetchGoogleSheetsForUser,
  fetchGoogleSpreadsheetsForUser,
} from "@/integrations/google/api";
import { auth } from "@/lib/auth";

export type GoogleSheetsToken = Realtime.Token<
  typeof googleSheetsChannel,
  ["status"]
>;

export async function fetchGoogleSheetsRealtimeToken(): Promise<GoogleSheetsToken | null> {
  return safeGetToken(googleSheetsChannel(), [
    "status",
  ]) as Promise<GoogleSheetsToken | null>;
}

type GoogleSpreadsheet = {
  id: string;
  name: string;
};

type GoogleSheet = {
  title: string;
};

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function fetchGoogleSpreadsheets(
  credentialId: string,
): Promise<GoogleSpreadsheet[]> {
  const session = await getSession();

  return fetchGoogleSpreadsheetsForUser({
    credentialId,
    userId: session.user.id,
  });
}

export async function fetchGoogleSheets(
  credentialId: string,
  spreadsheetId: string,
): Promise<GoogleSheet[]> {
  const session = await getSession();

  return fetchGoogleSheetsForUser({
    credentialId,
    userId: session.user.id,
    spreadsheetId,
  });
}

export async function fetchGoogleSheetColumns(
  credentialId: string,
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[]> {
  const session = await getSession();

  return fetchGoogleSheetColumnsForUser({
    credentialId,
    userId: session.user.id,
    spreadsheetId,
    sheetTitle,
  });
}
