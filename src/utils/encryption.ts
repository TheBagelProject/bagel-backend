import crypto from 'crypto';
import dotenv from "dotenv";
dotenv.config();

const ENCRYPTION_KEY = "Yh3X8mPq92Zt5RkNw7Vc0Lr6Aq9Tb4Mn";
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error("PAT_ENCRYPTION_KEY is not set in environment variables.");
}
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("PAT_ENCRYPTION_KEY must be exactly 32 characters long.");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
