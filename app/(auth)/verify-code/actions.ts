"use server";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { getTwilio, getVerifyServiceSid } from "@/lib/twilio";
import { isValidE164, isValidOtp } from "@/lib/validation";

interface VerifyCodeResult {
  success: boolean;
  error?: string;
  existingUser?: boolean;
}

export async function verifyCode(
  phoneNumber: string,
  code: string
): Promise<VerifyCodeResult> {
  if (typeof phoneNumber !== "string" || typeof code !== "string") {
    return { success: false, error: "Invalid input." };
  }

  const trimmedPhone = phoneNumber.trim();
  const trimmedCode = code.trim();

  if (!isValidE164(trimmedPhone)) {
    return { success: false, error: "Invalid phone number." };
  }

  if (!isValidOtp(trimmedCode)) {
    return { success: false, error: "Code must be 6 digits." };
  }

  try {
    const twilioClient = getTwilio();
    const serviceSid = getVerifyServiceSid();

    const verificationCheck = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: trimmedPhone,
        code: trimmedCode,
      });

    if (verificationCheck.status !== "approved") {
      return { success: false, error: "Invalid or expired code." };
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        phoneNumber: trimmedPhone,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (record) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { verified: true },
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: trimmedPhone },
      select: { id: true },
    });

    if (existingUser) {
      await createSession(existingUser.id);
      return { success: true, existingUser: true };
    }

    return { success: true, existingUser: false };
  } catch (error) {
    console.error("verifyCode failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

const RATE_LIMIT_WINDOW_MINUTES = 10;
const MAX_CODES_PER_WINDOW = 5;
const CODE_EXPIRY_MINUTES = 10;

export async function resendCode(
  phoneNumber: string
): Promise<VerifyCodeResult> {
  if (typeof phoneNumber !== "string") {
    return { success: false, error: "Invalid phone number." };
  }

  const trimmed = phoneNumber.trim();

  if (!isValidE164(trimmed)) {
    return { success: false, error: "Invalid phone number format." };
  }

  try {
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    );

    const recentCodeCount = await prisma.verificationCode.count({
      where: {
        phoneNumber: trimmed,
        createdAt: { gte: windowStart },
      },
    });

    if (recentCodeCount >= MAX_CODES_PER_WINDOW) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
      };
    }

    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        phoneNumber: trimmed,
        expiresAt,
      },
      select: { id: true },
    });

    const twilioClient = getTwilio();
    const serviceSid = getVerifyServiceSid();

    await twilioClient.verify.v2.services(serviceSid).verifications.create({
      to: trimmed,
      channel: "sms",
    });

    return { success: true };
  } catch (error) {
    console.error("resendCode failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
