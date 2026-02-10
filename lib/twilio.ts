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

export function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) {
    throw new Error("Missing TWILIO_VERIFY_SERVICE_SID");
  }
  return sid;
}
