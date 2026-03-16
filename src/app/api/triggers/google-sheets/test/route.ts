import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

type RequestBody = {
  credentialId: string;
  spreadsheetId: string;
  range: string;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.credentialId || !body.spreadsheetId || !body.range) {
      return NextResponse.json(
        { error: "credentialId, spreadsheetId, and range are required" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credential = await prisma.credential.findUnique({
      where: { id: body.credentialId, userId: session.user.id },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const refreshToken = decrypt(credential.value);
    const accessToken = await getAccessToken(refreshToken);

    const values: string[][] = [
      ["Test row from Litchoo", new Date().toISOString()],
    ];

    const response = await ky
      .post(
        `https://sheets.googleapis.com/v4/spreadsheets/${body.spreadsheetId}/values/${encodeURIComponent(
          body.range,
        )}:append?valueInputOption=USER_ENTERED`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          json: { values },
        },
      )
      .json<{ updates: { updatedRange: string; updatedRows: number } }>();

    return NextResponse.json(
      {
        success: true,
        updatedRange: response.updates.updatedRange,
        updatedRows: response.updates.updatedRows,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Google Sheets test append error:", error);
    return NextResponse.json(
      { error: "Failed to append test row to Google Sheets" },
      { status: 500 },
    );
  }
}

