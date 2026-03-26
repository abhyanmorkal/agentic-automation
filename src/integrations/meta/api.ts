import ky from "ky";
import {
  getMetaAccessTokenForUser,
  getMetaGraphUrl,
  getMetaPageAccessToken,
  parseMetaApiError,
} from "./auth";

export type MetaFacebookPage = {
  id: string;
  name: string;
  category: string;
  access_token: string;
};

export type MetaFacebookLeadForm = {
  id: string;
  name: string;
  status: string;
  leads_count?: number;
};

export type MetaFacebookLeadField = {
  name: string;
  values: string[];
};

export type MetaFacebookSampleLead = {
  id: string;
  created_time: string;
  field_data: MetaFacebookLeadField[];
  form_id: string;
};

type MetaCredentialContext = {
  credentialId: string;
  userId: string;
};

export const testMetaConnection = async ({
  credentialId,
  userId,
}: MetaCredentialContext) => {
  const accessToken = await getMetaAccessTokenForUser({ credentialId, userId });

  return ky
    .get(getMetaGraphUrl("me"), {
      searchParams: { access_token: accessToken, fields: "id,name" },
    })
    .json<{ id: string; name?: string }>()
    .catch(parseMetaApiError);
};

export const fetchMetaPages = async ({
  credentialId,
  userId,
}: MetaCredentialContext): Promise<MetaFacebookPage[]> => {
  const accessToken = await getMetaAccessTokenForUser({ credentialId, userId });

  const response = await ky
    .get(getMetaGraphUrl("me/accounts"), {
      searchParams: {
        access_token: accessToken,
        fields: "id,name,category,access_token",
        limit: "50",
      },
    })
    .json<{ data: MetaFacebookPage[] }>()
    .catch(parseMetaApiError);

  return response.data;
};

export const fetchMetaLeadForms = async ({
  credentialId,
  userId,
  pageId,
}: MetaCredentialContext & {
  pageId: string;
}): Promise<MetaFacebookLeadForm[]> => {
  const pageToken = await getMetaPageAccessToken({
    credentialId,
    userId,
    pageId,
  });

  const formsResponse = await ky
    .get(getMetaGraphUrl(`${pageId}/leadgen_forms`), {
      searchParams: {
        access_token: pageToken,
        fields: "id,name,status,leads_count",
        limit: "50",
      },
    })
    .json<{ data: MetaFacebookLeadForm[] }>()
    .catch(parseMetaApiError);

  return formsResponse.data;
};

export const fetchMetaSampleLead = async ({
  credentialId,
  userId,
  pageId,
  formId,
}: MetaCredentialContext & {
  pageId: string;
  formId: string;
}): Promise<MetaFacebookSampleLead | null> => {
  const pageToken = await getMetaPageAccessToken({
    credentialId,
    userId,
    pageId,
  });

  const leadsResponse = await ky
    .get(getMetaGraphUrl(`${formId}/leads`), {
      searchParams: {
        access_token: pageToken,
        limit: "1",
        fields: "id,created_time,field_data,form_id",
      },
    })
    .json<{ data: MetaFacebookSampleLead[] }>()
    .catch(parseMetaApiError);

  return leadsResponse.data[0] ?? null;
};

export const subscribeMetaPageToLeadgenWebhook = async ({
  credentialId,
  userId,
  pageId,
}: MetaCredentialContext & {
  pageId: string;
}) => {
  const pageToken = await getMetaPageAccessToken({
    credentialId,
    userId,
    pageId,
  });

  await ky
    .post(getMetaGraphUrl(`${pageId}/subscribed_apps`), {
      searchParams: {
        access_token: pageToken,
        subscribed_fields: "leadgen",
      },
    })
    .json()
    .catch(parseMetaApiError);
};
