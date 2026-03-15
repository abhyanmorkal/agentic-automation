import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { airtableChannel } from "@/inngest/channels/airtable";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type AirtableData = {
  variableName?: string;
  credentialId?: string;
  baseId?: string;
  tableId?: string;
  fields?: string;
};

export const airtableExecutor: NodeExecutor<AirtableData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(airtableChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Airtable node: Variable name is missing");
  }
  if (!data.credentialId) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Airtable node: Credential is required");
  }
  if (!data.baseId) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Airtable node: Base ID is required");
  }
  if (!data.tableId) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Airtable node: Table ID is required");
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({ where: { id: data.credentialId, userId } }),
  );
  if (!credential) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Airtable node: Credential not found");
  }

  const token = decrypt(credential.value);

  let parsedFields: Record<string, unknown> = {};
  if (data.fields) {
    const resolvedFields = decode(Handlebars.compile(data.fields)(context));
    try {
      parsedFields = JSON.parse(resolvedFields);
    } catch {
      await publish(airtableChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Airtable node: Fields must be valid JSON");
    }
  }

  try {
    const result = await step.run("airtable-create-record", async () => {
      const record = await ky
        .post(
          `https://api.airtable.com/v0/${data.baseId}/${data.tableId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            json: { fields: parsedFields },
          },
        )
        .json<{ id: string; createdTime: string; fields: Record<string, unknown> }>();

      return {
        ...context,
        [data.variableName!]: {
          recordId: record.id,
          createdTime: record.createdTime,
          fields: record.fields,
        },
      };
    });

    await publish(airtableChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(airtableChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
