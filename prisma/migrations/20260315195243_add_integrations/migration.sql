-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'TELEGRAM_BOT_TOKEN';
ALTER TYPE "CredentialType" ADD VALUE 'NOTION_API_KEY';
ALTER TYPE "CredentialType" ADD VALUE 'AIRTABLE_API_KEY';
ALTER TYPE "CredentialType" ADD VALUE 'RESEND_API_KEY';
ALTER TYPE "CredentialType" ADD VALUE 'TWILIO';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_OAUTH';
ALTER TYPE "CredentialType" ADD VALUE 'META_ACCESS_TOKEN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM';
ALTER TYPE "NodeType" ADD VALUE 'NOTION';
ALTER TYPE "NodeType" ADD VALUE 'AIRTABLE';
ALTER TYPE "NodeType" ADD VALUE 'SEND_EMAIL';
ALTER TYPE "NodeType" ADD VALUE 'SEND_SMS';
ALTER TYPE "NodeType" ADD VALUE 'GMAIL';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_SHEETS';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "NodeType" ADD VALUE 'WHATSAPP';
ALTER TYPE "NodeType" ADD VALUE 'INSTAGRAM';
ALTER TYPE "NodeType" ADD VALUE 'FACEBOOK_PAGE';
ALTER TYPE "NodeType" ADD VALUE 'MCP_TOOL';
