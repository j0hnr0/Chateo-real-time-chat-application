import { sendVerificationCode } from "../actions";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationCode: {
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/twilio", () => ({
  getTwilio: jest.fn(),
  getVerifyServiceSid: jest.fn(() => "VA_test_sid"),
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    verificationCode: {
      count: jest.Mock;
      create: jest.Mock;
    };
  };
};

const { getTwilio } = jest.requireMock("@/lib/twilio") as {
  getTwilio: jest.Mock;
};

const mockCreate = jest.fn().mockResolvedValue({ sid: "VE_test" });
getTwilio.mockReturnValue({
  verify: {
    v2: {
      services: () => ({
        verifications: { create: mockCreate },
      }),
    },
  },
});

describe("sendVerificationCode", () => {
  beforeEach(() => {
    prisma.verificationCode.count.mockResolvedValue(0);
    prisma.verificationCode.create.mockResolvedValue({ id: "test-id" });
    mockCreate.mockResolvedValue({ sid: "VE_test" });
  });

  it("returns error for non-string input", async () => {
    const result = await sendVerificationCode(123 as unknown as string);
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number.",
    });
  });

  it("returns error for invalid E.164 format", async () => {
    const result = await sendVerificationCode("555-1234");
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number format.",
    });
  });

  it("returns error for empty string", async () => {
    const result = await sendVerificationCode("  ");
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number format.",
    });
  });

  it("returns error when rate limited", async () => {
    prisma.verificationCode.count.mockResolvedValue(5);

    const result = await sendVerificationCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again later.",
    });
    expect(prisma.verificationCode.create).not.toHaveBeenCalled();
  });

  it("creates record and calls Twilio on success", async () => {
    const result = await sendVerificationCode("+12125551234");

    expect(result).toEqual({ success: true });
    expect(prisma.verificationCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: "+12125551234",
        }),
      })
    );
    expect(mockCreate).toHaveBeenCalledWith({
      to: "+12125551234",
      channel: "sms",
    });
  });

  it("returns generic error on Twilio failure", async () => {
    mockCreate.mockRejectedValue(new Error("Twilio error"));

    const result = await sendVerificationCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("returns generic error on database failure", async () => {
    prisma.verificationCode.create.mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await sendVerificationCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
