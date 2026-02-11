import { verifyCode, resendCode } from "../actions";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationCode: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
};

const { getTwilio } = jest.requireMock("@/lib/twilio") as {
  getTwilio: jest.Mock;
};

const mockCheckCreate = jest.fn();
const mockVerificationCreate = jest.fn();

getTwilio.mockReturnValue({
  verify: {
    v2: {
      services: () => ({
        verificationChecks: { create: mockCheckCreate },
        verifications: { create: mockVerificationCreate },
      }),
    },
  },
});

describe("verifyCode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckCreate.mockResolvedValue({ status: "approved" });
    prisma.verificationCode.findFirst.mockResolvedValue({ id: "vc-1" });
    prisma.verificationCode.update.mockResolvedValue({});
  });

  it("returns error for non-string phoneNumber", async () => {
    const result = await verifyCode(123 as unknown as string, "123456");
    expect(result).toEqual({ success: false, error: "Invalid input." });
  });

  it("returns error for non-string code", async () => {
    const result = await verifyCode("+12125551234", 123456 as unknown as string);
    expect(result).toEqual({ success: false, error: "Invalid input." });
  });

  it("returns error for invalid E.164 phone", async () => {
    const result = await verifyCode("555-1234", "123456");
    expect(result).toEqual({ success: false, error: "Invalid phone number." });
  });

  it("returns error for invalid OTP format", async () => {
    const result = await verifyCode("+12125551234", "12345");
    expect(result).toEqual({ success: false, error: "Code must be 6 digits." });
  });

  it("returns error for non-numeric OTP", async () => {
    const result = await verifyCode("+12125551234", "abcdef");
    expect(result).toEqual({ success: false, error: "Code must be 6 digits." });
  });

  it("returns error when Twilio status is not approved", async () => {
    mockCheckCreate.mockResolvedValue({ status: "pending" });

    const result = await verifyCode("+12125551234", "123456");
    expect(result).toEqual({
      success: false,
      error: "Invalid or expired code.",
    });
    expect(prisma.verificationCode.findFirst).not.toHaveBeenCalled();
  });

  it("marks verification record as verified on success", async () => {
    const result = await verifyCode("+12125551234", "123456");

    expect(result).toEqual({ success: true });
    expect(mockCheckCreate).toHaveBeenCalledWith({
      to: "+12125551234",
      code: "123456",
    });
    expect(prisma.verificationCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          phoneNumber: "+12125551234",
          verified: false,
        }),
      })
    );
    expect(prisma.verificationCode.update).toHaveBeenCalledWith({
      where: { id: "vc-1" },
      data: { verified: true },
    });
  });

  it("succeeds without updating when no DB record found", async () => {
    prisma.verificationCode.findFirst.mockResolvedValue(null);

    const result = await verifyCode("+12125551234", "123456");

    expect(result).toEqual({ success: true });
    expect(prisma.verificationCode.update).not.toHaveBeenCalled();
  });

  it("trims whitespace from inputs", async () => {
    const result = await verifyCode("  +12125551234  ", "  123456  ");

    expect(result).toEqual({ success: true });
    expect(mockCheckCreate).toHaveBeenCalledWith({
      to: "+12125551234",
      code: "123456",
    });
  });

  it("returns generic error on Twilio failure", async () => {
    mockCheckCreate.mockRejectedValue(new Error("Twilio error"));

    const result = await verifyCode("+12125551234", "123456");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("returns generic error on database failure", async () => {
    prisma.verificationCode.findFirst.mockRejectedValue(
      new Error("DB error")
    );

    const result = await verifyCode("+12125551234", "123456");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("resendCode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.verificationCode.count.mockResolvedValue(0);
    prisma.verificationCode.create.mockResolvedValue({ id: "vc-2" });
    mockVerificationCreate.mockResolvedValue({ sid: "VE_test" });
  });

  it("returns error for non-string input", async () => {
    const result = await resendCode(123 as unknown as string);
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number.",
    });
  });

  it("returns error for invalid E.164 format", async () => {
    const result = await resendCode("555-1234");
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number format.",
    });
  });

  it("returns error for empty string", async () => {
    const result = await resendCode("  ");
    expect(result).toEqual({
      success: false,
      error: "Invalid phone number format.",
    });
  });

  it("returns error when rate limited", async () => {
    prisma.verificationCode.count.mockResolvedValue(5);

    const result = await resendCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again later.",
    });
    expect(prisma.verificationCode.create).not.toHaveBeenCalled();
  });

  it("creates record and calls Twilio on success", async () => {
    const result = await resendCode("+12125551234");

    expect(result).toEqual({ success: true });
    expect(prisma.verificationCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: "+12125551234",
        }),
      })
    );
    expect(mockVerificationCreate).toHaveBeenCalledWith({
      to: "+12125551234",
      channel: "sms",
    });
  });

  it("returns generic error on Twilio failure", async () => {
    mockVerificationCreate.mockRejectedValue(new Error("Twilio error"));

    const result = await resendCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("returns generic error on database failure", async () => {
    prisma.verificationCode.create.mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await resendCode("+12125551234");
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
