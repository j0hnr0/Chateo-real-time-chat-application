import Twilio from "twilio";

let client: ReturnType<typeof Twilio> | null = null;

export function getTwilio() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error("Missing Twilio credentials");
    }

    client = Twilio(accountSid, authToken);
  }

  return client;
}

export function getTwilioFromNumber(): string {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("Missing TWILIO_PHONE_NUMBER");
  }
  return from;
}
