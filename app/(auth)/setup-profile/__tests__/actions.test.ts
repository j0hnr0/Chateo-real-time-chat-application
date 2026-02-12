import { createProfile } from "../actions";

jest.mock("@/lib/session", () => ({
  createSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationCode: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    verificationCode: {
      findFirst: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
};

describe("createProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.verificationCode.findFirst.mockResolvedValue({ id: "vc-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "user-1" });
  });

  it("returns error for non-string phoneNumber", async () => {
    const result = await createProfile({
      phoneNumber: 123 as unknown as string,
      firstName: "John",
    });
    expect(result).toEqual({ success: false, error: "Invalid input." });
  });

  it("returns error for non-string firstName", async () => {
    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: 123 as unknown as string,
    });
    expect(result).toEqual({ success: false, error: "Invalid input." });
  });

  it("returns error for invalid E.164 phone", async () => {
    const result = await createProfile({
      phoneNumber: "555-1234",
      firstName: "John",
    });
    expect(result).toEqual({ success: false, error: "Invalid phone number." });
  });

  it("returns error for empty first name", async () => {
    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "   ",
    });
    expect(result).toEqual({ success: false, error: "First name is required." });
  });

  it("returns error for first name over 50 characters", async () => {
    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "A".repeat(51),
    });
    expect(result).toEqual({
      success: false,
      error: "First name must be 50 characters or less.",
    });
  });

  it("returns error for last name over 50 characters", async () => {
    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
      lastName: "B".repeat(51),
    });
    expect(result).toEqual({
      success: false,
      error: "Last name must be 50 characters or less.",
    });
  });

  it("returns error when phone is not verified", async () => {
    prisma.verificationCode.findFirst.mockResolvedValue(null);

    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
    });
    expect(result).toEqual({
      success: false,
      error: "Phone number not verified.",
    });
  });

  it("returns error when user already exists", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
    });
    expect(result).toEqual({
      success: false,
      error: "Account already exists.",
    });
  });

  it("creates user on success and sets session", async () => {
    const { createSession } = jest.requireMock("@/lib/session") as {
      createSession: jest.Mock;
    };

    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
      lastName: "Doe",
    });

    expect(result).toEqual({ success: true, userId: "user-1" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "+12125551234",
        firstName: "John",
        lastName: "Doe",
      },
      select: { id: true },
    });
    expect(createSession).toHaveBeenCalledWith("user-1");
  });

  it("creates user without last name", async () => {
    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
    });

    expect(result).toEqual({ success: true, userId: "user-1" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "+12125551234",
        firstName: "John",
        lastName: null,
      },
      select: { id: true },
    });
  });

  it("trims whitespace from inputs", async () => {
    const result = await createProfile({
      phoneNumber: "  +12125551234  ",
      firstName: "  John  ",
      lastName: "  Doe  ",
    });

    expect(result).toEqual({ success: true, userId: "user-1" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "+12125551234",
        firstName: "John",
        lastName: "Doe",
      },
      select: { id: true },
    });
  });

  it("returns generic error on database failure", async () => {
    prisma.verificationCode.findFirst.mockRejectedValue(
      new Error("DB error")
    );

    const result = await createProfile({
      phoneNumber: "+12125551234",
      firstName: "John",
    });
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
