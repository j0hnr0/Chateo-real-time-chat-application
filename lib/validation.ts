const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const OTP_REGEX = /^[0-9]{6}$/;

export function isValidE164(phoneNumber: string): boolean {
  return E164_REGEX.test(phoneNumber);
}

export function isValidOtp(code: string): boolean {
  return OTP_REGEX.test(code);
}
