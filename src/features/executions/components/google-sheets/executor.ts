import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import {
  getGoogleAccessToken,
  loadGoogleRefreshToken,
  parseGoogleApiError,
} from "@/integrations/google/auth";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

/**
 * Resolve a dotted/bracketed path like `webhook.savedResponses['Response A'].data.email`
 * against a context object. Returns the resolved value or "" if the path doesn't exist.
 */
function resolvePath(obj: unknown, path: string): string {
  // Split the path into segments, handling both dot notation and bracket notation
  // e.g. "webhook.savedResponses['Response A'].data.email"
  // becomes ["webhook", "savedResponses", "Response A", "data", "email"]
  const segments: string[] = [];
  const re = /\[['"]?(.+?)['"]?\]|([^.[]]+)/g;
  let match = re.exec(path);
  while (match !== null) {
    const segment = match[1] ?? match[2];
    if (segment) {
      segments.push(segment);
    }
    match = re.exec(path);
  }

  let current: unknown = obj;
  for (const seg of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return "";
    }
    current = (current as Record<string, unknown>)[seg];
  }

  if (current === null || current === undefined) return "";
  if (typeof current === "object") return JSON.stringify(current);
  return String(current);
}

/**
 * Pre-process a template string by resolving any `{{path}}` expressions that contain
 * bracket notation (which Handlebars can't parse) directly from the context.
 * Standard dot-notation expressions are left for Handlebars to handle.
 */
function resolveTemplateValues(
  template: string,
  context: Record<string, unknown>,
): string {
  // Backward compatibility: automatically upgrade old templates that refer to
  // design-time saved responses to instead use the live execution data paths.
  let upgradedTemplate = template;

  // Upgrades: {{webhook.savedResponses['Response A'].data.email}} -> {{webhook.body.email}}
  upgradedTemplate = upgradedTemplate.replace(
    /\{\{\s*webhook\.savedResponses\[.*?\]\.data\.(.*?)\s*\}\}/g,
    "{{webhook.body.$1}}",
  );

  // Upgrades: {{facebookLead.savedResponses['X'].data.email}} -> {{facebookLead.fields.email}}
  // Note: While facebookLead used sampleResponseSimple/Advanced, we mapped it to savedResponse
  // virtually in the frontend, so it might have been saved in this format if a user updated during development.
  upgradedTemplate = upgradedTemplate.replace(
    /\{\{\s*facebookLead\.savedResponses\[.*?\]\.data\.(.*?)\s*\}\}/g,
    "{{facebookLead.fields.$1}}",
  );

  // First pass: resolve any remaining bracket-notation expressions manually
  const resolved = upgradedTemplate.replace(
    /\{\{([^}]*\[.*?\][^}]*)\}\}/g,
    (_match, path: string) => {
      return resolvePath(context, path.trim());
    },
  );

  // Second pass: let Handlebars handle any remaining standard expressions
  try {
    return decode(Handlebars.compile(resolved)(context));
  } catch {
    // If Handlebars still fails, return the manually resolved string
    return decode(resolved);
  }
}

type GoogleSheetsData = {
  variableName?: string;
  credentialId?: string;
  spreadsheetId?: string;
  sheetTitle?: string;
  range?: string;
  values?: string;
  action?: "append" | "read" | "update" | "delete" | "clear" | "create_sheet";
  sourceVariable?: string;
  columnMappings?: Record<string, string | undefined>;
  readFilter?: { column: string; operator: string; value: string };
  readOutputMapping?: Record<string, string>;
  updateRowNumber?: string;
  deleteRowNumber?: string;
  newSheetName?: string;
};

function matchesFilter(
  cellValue: string,
  operator: string,
  filterValue: string,
): boolean {
  const cell = cellValue.toLowerCase();
  const filter = filterValue.toLowerCase();
  switch (operator) {
    case "equals":
      return cell === filter;
    case "contains":
      return cell.includes(filter);
    case "starts_with":
      return cell.startsWith(filter);
    case "ends_with":
      return cell.endsWith(filter);
    default:
      return cell === filter;
  }
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
    throw new NonRetriableError(
      "Google Sheets node: Spreadsheet ID is required",
    );
  }
  if (!data.range) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Google Sheets node: Range is required (e.g. Sheet1!A:Z)",
    );
  }

  const refreshToken = await loadGoogleRefreshToken({
    credentialId: data.credentialId,
    userId,
    step,
    nodeName: "Google Sheets node",
  });
  const variableName = data.variableName;
  const action = data.action ?? "append";
  const spreadsheetId = data.spreadsheetId;
  let range = decode(Handlebars.compile(data.range)(context));
  if (action === "append" && range.includes("!")) {
    // For Appending, rigid bounds like Sheet1!A:C cause Google Sheets to discard mapping items beyond column C.
    // We strip to just the Sheet Title so it dynamically detects the full table width and accepts infinite columns.
    range = range.split("!")[0] ?? range;
  }

  try {
    const result = await step.run("google-sheets-action", async () => {
      const accessToken = await getGoogleAccessToken(refreshToken);

      if (action === "read") {
        const response = await ky
          .get(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{ values: string[][] }>()
          .catch(parseGoogleApiError);

        const rows = response.values ?? [];
        const headers = rows[0] ?? [];
        let dataRows = rows.slice(1);

        // Apply row filter if configured
        const filter = data.readFilter;
        if (filter?.column && filter.value) {
          const colIndex = headers.indexOf(filter.column);
          if (colIndex >= 0) {
            const filterValue = resolveTemplateValues(
              filter.value,
              context as Record<string, unknown>,
            );
            dataRows = dataRows.filter((row) =>
              matchesFilter(row[colIndex] ?? "", filter.operator, filterValue),
            );
          }
        }

        // Apply output mapping if configured
        const outputMapping = data.readOutputMapping;
        const hasMapping =
          outputMapping && Object.values(outputMapping).some((v) => v);

        if (hasMapping) {
          const mappedRows = dataRows.map((row) => {
            const mapped: Record<string, string> = {};
            for (const [col, varName] of Object.entries(outputMapping)) {
              if (!varName) continue;
              const colIdx = headers.indexOf(col);
              mapped[varName] = colIdx >= 0 ? (row[colIdx] ?? "") : "";
            }
            return mapped;
          });

          return {
            ...context,
            [variableName]: {
              rows: mappedRows,
              row: mappedRows[0] ?? {},
              totalRows: mappedRows.length,
              headers,
              range,
            },
          };
        }

        return {
          ...context,
          [variableName]: {
            values: dataRows,
            row: dataRows[0] ?? [],
            totalRows: dataRows.length,
            headers,
            range,
          },
        };
      }

      // ── Update Row ──────────────────────────────────────────────────────────
      if (action === "update") {
        const rawRowNum = resolveTemplateValues(
          data.updateRowNumber ?? "",
          context as Record<string, unknown>,
        );
        const rowNum = parseInt(rawRowNum, 10);
        if (!rawRowNum || isNaN(rowNum) || rowNum < 1) {
          throw new NonRetriableError(
            "Google Sheets node: A valid row number is required for Update Row",
          );
        }

        // Fetch headers so we can build the value array in column order
        const headersResp = await ky
          .get(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range + "!1:1")}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{ values?: string[][] }>()
          .catch(parseGoogleApiError);

        const headers: string[] = headersResp.values?.[0] ?? [];
        const mappings = data.columnMappings ?? {};

        // Build a row array in header order; resolve any template values
        const rowValues = headers.map((col) => {
          const tpl = mappings[col];
          if (!tpl) return null; // null = don't overwrite this cell
          return resolveTemplateValues(tpl, context as Record<string, unknown>);
        });

        // Use a named range like Sheet1!A5:Z5
        const sheet = range.includes("!") ? range.split("!")[0] : range;
        const updateRange = `${sheet}!A${rowNum}:${String.fromCharCode(65 + headers.length - 1)}${rowNum}`;

        const updResp = await ky
          .put(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              json: { values: [rowValues.map((v) => v ?? "")] },
            },
          )
          .json<{ updatedRange: string; updatedRows: number }>()
          .catch(parseGoogleApiError);

        return {
          ...context,
          [variableName]: {
            updatedRange: updResp.updatedRange,
            updatedRows: updResp.updatedRows,
            rowNumber: rowNum,
          },
        };
      }

      // ── Delete Row ──────────────────────────────────────────────────────────
      if (action === "delete") {
        const rawRowNum = resolveTemplateValues(
          data.deleteRowNumber ?? "",
          context as Record<string, unknown>,
        );
        const rowNum = parseInt(rawRowNum, 10);
        if (!rawRowNum || isNaN(rowNum) || rowNum < 1) {
          throw new NonRetriableError(
            "Google Sheets node: A valid row number is required for Delete Row",
          );
        }

        // Get sheetId (the internal numeric ID, not the title)
        const metaResp = await ky
          .get(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          .json<{ sheets: { properties: { sheetId: number; title: string } }[] }>()
          .catch(parseGoogleApiError);

        const sheet = range.includes("!") ? range.split("!")[0] : range;
        const sheetMeta = metaResp.sheets.find(
          (s) => s.properties.title === sheet,
        );
        if (!sheetMeta) {
          throw new NonRetriableError(
            `Google Sheets node: Sheet "${sheet}" not found in spreadsheet`,
          );
        }

        await ky
          .post(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              json: {
                requests: [
                  {
                    deleteDimension: {
                      range: {
                        sheetId: sheetMeta.properties.sheetId,
                        dimension: "ROWS",
                        startIndex: rowNum - 1,
                        endIndex: rowNum,
                      },
                    },
                  },
                ],
              },
            },
          )
          .json()
          .catch(parseGoogleApiError);

        return {
          ...context,
          [variableName]: {
            deletedRow: rowNum,
            spreadsheetId,
          },
        };
      }

      // ── Clear Range ─────────────────────────────────────────────────────────
      if (action === "clear") {
        await ky
          .post(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
            { headers: { Authorization: `Bearer ${accessToken}` }, json: {} },
          )
          .json()
          .catch(parseGoogleApiError);

        return {
          ...context,
          [variableName]: {
            clearedRange: range,
            spreadsheetId,
          },
        };
      }

      // ── Create Sheet Tab ────────────────────────────────────────────────────
      if (action === "create_sheet") {
        const newTitle = resolveTemplateValues(
          data.newSheetName ?? "",
          context as Record<string, unknown>,
        ).trim();
        if (!newTitle) {
          throw new NonRetriableError(
            "Google Sheets node: A sheet tab name is required for Create Sheet Tab",
          );
        }

        const createResp = await ky
          .post(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              json: {
                requests: [{ addSheet: { properties: { title: newTitle } } }],
              },
            },
          )
          .json<{
            replies: { addSheet?: { properties: { sheetId: number; title: string } } }[];
          }>()
          .catch(parseGoogleApiError);

        const created = createResp.replies[0]?.addSheet?.properties;

        return {
          ...context,
          [variableName]: {
            createdSheetTitle: created?.title ?? newTitle,
            createdSheetId: created?.sheetId,
            spreadsheetId,
          },
        };
      }

      // Append
      let parsedValues: string[][] = [[]];
      if (data.values) {
        const resolvedValues = resolveTemplateValues(
          data.values,
          context as Record<string, unknown>,
        );
        try {
          parsedValues = JSON.parse(resolvedValues);
        } catch {
          throw new NonRetriableError(
            "Google Sheets node: Values must be a valid JSON 2D array",
          );
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
        .json<{ updates: { updatedRange: string; updatedRows: number } }>()
        .catch(parseGoogleApiError);

      return {
        ...context,
        [variableName]: {
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
