import Cryptr from "cryptr";

const key =
  process.env.ENCRYPTION_KEY?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "dev-encryption-key-do-not-use-in-production"
    : null);

if (!key) {
  throw new Error(
    "ENCRYPTION_KEY is required. Add it to your .env file (e.g. run: openssl rand -base64 32)"
  );
}

const cryptr = new Cryptr(key);

export const encrypt = (text: string) => cryptr.encrypt(text);
export const decrypt = (text: string) => cryptr.decrypt(text);
