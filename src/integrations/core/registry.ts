import type { CredentialType } from "@/generated/prisma";
import { googleConnectorDefinition } from "../google/definition";
import { metaConnectorDefinition } from "../meta/definition";
import type { ConnectorDefinition, ConnectorId } from "./definitions";

const connectorDefinitions = [
  googleConnectorDefinition,
  metaConnectorDefinition,
] as const satisfies readonly ConnectorDefinition[];

export const connectorsById: Record<ConnectorId, ConnectorDefinition> =
  connectorDefinitions.reduce(
    (accumulator, definition) => {
      accumulator[definition.id] = definition;
      return accumulator;
    },
    {} as Record<ConnectorId, ConnectorDefinition>,
  );

const connectorDefinitionsByCredentialType = connectorDefinitions.reduce(
  (accumulator, definition) => {
    for (const credentialType of definition.credentialTypes) {
      accumulator[credentialType] = definition;
    }

    return accumulator;
  },
  {} as Partial<Record<CredentialType, ConnectorDefinition>>,
);

export const listConnectorDefinitions = () => connectorDefinitions;

export const getConnectorById = (connectorId: ConnectorId) =>
  connectorsById[connectorId];

export const getConnectorForCredentialType = (credentialType: CredentialType) =>
  connectorDefinitionsByCredentialType[credentialType] ?? null;
