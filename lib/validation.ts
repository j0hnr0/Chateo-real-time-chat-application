import { randomInt } from "crypto";

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function isValidE164(phoneNumber: string): boolean {
  return E164_REGEX.test(phoneNumber);
}

export function generateVerificationCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}
