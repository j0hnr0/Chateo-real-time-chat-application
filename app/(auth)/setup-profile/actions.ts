"use server";

import { prisma } from "@/lib/prisma";
import { isValidE164 } from "@/lib/validation";

interface CreateProfileInput {
  phoneNumber: string;
  firstName: string;
  lastName?: string;
}

interface CreateProfileResult {
  success: boolean;
  error?: string;
}

export async function createProfile(
  input: CreateProfileInput
): Promise<CreateProfileResult> {
  const { phoneNumber, firstName, lastName } = input;

  if (typeof phoneNumber !== "string" || typeof firstName !== "string") {
    return { success: false, error: "Invalid input." };
  }

  const trimmedPhone = phoneNumber.trim();
  const trimmedFirst = firstName.trim();
  const trimmedLast = typeof lastName === "string" ? lastName.trim() : undefined;

  if (!isValidE164(trimmedPhone)) {
    return { success: false, error: "Invalid phone number." };
  }

  if (trimmedFirst.length === 0) {
    return { success: false, error: "First name is required." };
  }

  if (trimmedFirst.length > 50) {
    return { success: false, error: "First name must be 50 characters or less." };
  }

  if (trimmedLast && trimmedLast.length > 50) {
    return { success: false, error: "Last name must be 50 characters or less." };
  }

  try {
    const verifiedRecord = await prisma.verificationCode.findFirst({
      where: {
        phoneNumber: trimmedPhone,
        verified: true,
      },
      select: { id: true },
    });

    if (!verifiedRecord) {
      return { success: false, error: "Phone number not verified." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: trimmedPhone },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, error: "Account already exists." };
    }

    await prisma.user.create({
      data: {
        phoneNumber: trimmedPhone,
        firstName: trimmedFirst,
        lastName: trimmedLast ?? null,
      },
      select: { id: true },
    });

    return { success: true };
  } catch (error) {
    console.error("createProfile failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
