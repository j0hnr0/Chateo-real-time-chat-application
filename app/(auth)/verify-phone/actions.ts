"use server";

import { prisma } from "@/lib/prisma";
import { getTwilio, getTwilioFromNumber } from "@/lib/twilio";
import { isValidE164, generateVerificationCode } from "@/lib/validation";

interface SendCodeResult {
  success: boolean;
  error?: string;
}

const RATE_LIMIT_WINDOW_MINUTES = 10;
const MAX_CODES_PER_WINDOW = 5;
const CODE_EXPIRY_MINUTES = 10;

export async function sendVerificationCode(
  phoneNumber: string
): Promise<SendCodeResult> {
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

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        phoneNumber: trimmed,
        code,
        expiresAt,
      },
      select: { id: true },
    });

    const twilioClient = getTwilio();
    await twilioClient.messages.create({
      to: trimmed,
      from: getTwilioFromNumber(),
      body: `Your Chateo verification code is: ${code}. It expires in ${CODE_EXPIRY_MINUTES} minutes.`,
    });

    return { success: true };
  } catch (error) {
    console.error("sendVerificationCode failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
