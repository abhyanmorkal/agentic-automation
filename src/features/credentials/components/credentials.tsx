"use client";

import { Anthropic, Gemini, Notion, OpenAI } from "@lobehub/icons";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import type { Credential, CredentialType } from "@/generated/prisma";
import { CredentialType as CredentialTypeEnum } from "@/generated/prisma";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { getConnectorForCredentialType } from "@/integrations/core/registry";
import {
  useRemoveCredential,
  useSuspenseCredentials,
} from "../hooks/use-credentials";
import { useCredentialsParams } from "../hooks/use-credentials-params";

export const CredentialsSearch = () => {
  const [params, setParams] = useCredentialsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search credentials"
    />
  );
};

export const CredentialsList = () => {
  const credentials = useSuspenseCredentials();

  return (
    <EntityList
      items={credentials.data.items}
      getKey={(credential) => credential.id}
      renderItem={(credential) => <CredentialItem data={credential} />}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {
  return (
    <EntityHeader
      title="Credentials"
      description="Create and manage your credentials"
      newButtonHref="/credentials/new"
      newButtonLabel="New credential"
      disabled={disabled}
    />
  );
};

export const CredentialsPagination = () => {
  const credentials = useSuspenseCredentials();
  const [params, setParams] = useCredentialsParams();

  return (
    <EntityPagination
      disabled={credentials.isFetching}
      totalPages={credentials.data.totalPages}
      page={credentials.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const CredentialsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<CredentialsHeader />}
      search={<CredentialsSearch />}
      pagination={<CredentialsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = () => {
  return <LoadingView message="Loading credentials..." />;
};

export const CredentialsError = () => {
  return <ErrorView message="Error loading credentials" />;
};

export const CredentialsEmpty = () => {
  const router = useRouter();

  const handleCreate = () => {
    router.push(`/credentials/new`);
  };

  return (
    <EmptyView
      onNew={handleCreate}
      message="You haven't created any credentials yet. Get started by creating your first credential"
    />
  );
};

type LobeIconComponent = ComponentType<{ size?: number; className?: string }>;
type CredentialLogoValue = string | LobeIconComponent;

const credentialLogos: Partial<Record<CredentialType, CredentialLogoValue>> = {
  [CredentialTypeEnum.OPENAI]: OpenAI,
  [CredentialTypeEnum.ANTHROPIC]: Anthropic,
  [CredentialTypeEnum.GEMINI]: Gemini.Color,
  [CredentialTypeEnum.TELEGRAM_BOT_TOKEN]: "/logos/telegram.svg",
  [CredentialTypeEnum.NOTION_API_KEY]: Notion,
  [CredentialTypeEnum.AIRTABLE_API_KEY]: "/logos/airtable.svg",
  [CredentialTypeEnum.RESEND_API_KEY]: "/logos/gmail.svg",
  [CredentialTypeEnum.TWILIO]: "/logos/telegram.svg",
};

export const CredentialItem = ({ data }: { data: Credential }) => {
  const removeCredential = useRemoveCredential();

  const handleRemove = () => {
    removeCredential.mutate({ id: data.id });
  };

  const connector = getConnectorForCredentialType(data.type);
  const logo =
    connector?.logoPath ?? credentialLogos[data.type] ?? "/logos/openai.svg";
  const altText = connector?.name ?? data.type;
  const logoPath = typeof logo === "string" ? logo : null;
  const LogoIcon = typeof logo === "string" ? null : logo;

  return (
    <EntityItem
      href={`/credentials/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
          &bull; Created{" "}
          {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          {LogoIcon ? (
            <LogoIcon size={20} />
          ) : (
            <Image
              src={logoPath ?? "/logos/openai.svg"}
              alt={altText}
              width={20}
              height={20}
            />
          )}
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeCredential.isPending}
    />
  );
};
