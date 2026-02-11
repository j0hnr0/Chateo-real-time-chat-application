import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerifyCodePage from "../page";

const mockGet = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

jest.mock("../actions", () => ({
  verifyCode: jest.fn(),
  resendCode: jest.fn(),
}));

const { verifyCode, resendCode } = jest.requireMock("../actions") as {
  verifyCode: jest.Mock;
  resendCode: jest.Mock;
};

describe("VerifyCodePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGet.mockReturnValue("+12125551234");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders fallback when no phone number is provided", () => {
    mockGet.mockReturnValue(null);
    render(<VerifyCodePage />);

    expect(screen.getByText("No phone number provided.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to phone verification/i })
    ).toHaveAttribute("href", "/verify-phone");
  });

  it("renders code input, heading, and masked phone number", () => {
    render(<VerifyCodePage />);

    expect(
      screen.getByRole("heading", { name: /enter verification code/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
    expect(screen.getByText(/we sent a code to/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify/i })
    ).toBeInTheDocument();
  });

  it("renders masked phone number correctly", () => {
    mockGet.mockReturnValue("+12125551234");
    render(<VerifyCodePage />);

    // +12125551234 has 12 chars, masked = start(2) + stars(6) + end(4)
    expect(screen.getByText(/\+1\*{6}1234/)).toBeInTheDocument();
  });

  it("only allows numeric input in code field", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    const input = screen.getByLabelText("Verification code");
    await user.type(input, "12ab34cd56ef");

    expect(input).toHaveValue("123456");
  });

  it("disables verify button when code is less than 6 digits", () => {
    render(<VerifyCodePage />);

    const button = screen.getByRole("button", { name: /verify/i });
    expect(button).toBeDisabled();
  });

  it("enables verify button when code is 6 digits", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    const input = screen.getByLabelText("Verification code");
    await user.type(input, "123456");

    const button = screen.getByRole("button", { name: /verify/i });
    expect(button).toBeEnabled();
  });

  it("displays success message on successful verification", async () => {
    verifyCode.mockResolvedValue({ success: true });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    const input = screen.getByLabelText("Verification code");
    await user.type(input, "123456");

    const button = screen.getByRole("button", { name: /verify/i });
    await user.click(button);

    expect(await screen.findByText("Phone verified!")).toBeInTheDocument();
  });

  it("displays error message on failed verification", async () => {
    verifyCode.mockResolvedValue({
      success: false,
      error: "Invalid or expired code.",
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    const input = screen.getByLabelText("Verification code");
    await user.type(input, "123456");

    const button = screen.getByRole("button", { name: /verify/i });
    await user.click(button);

    expect(
      await screen.findByText("Invalid or expired code.")
    ).toBeInTheDocument();
  });

  it("calls verifyCode with phone number and code", async () => {
    verifyCode.mockResolvedValue({ success: true });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    const input = screen.getByLabelText("Verification code");
    await user.type(input, "654321");

    const button = screen.getByRole("button", { name: /verify/i });
    await user.click(button);

    await screen.findByText("Phone verified!");
    expect(verifyCode).toHaveBeenCalledWith("+12125551234", "654321");
  });

  it("shows resend cooldown timer initially", () => {
    render(<VerifyCodePage />);

    expect(screen.getByText("Resend code in 30s")).toBeInTheDocument();
  });

  it("counts down the resend cooldown timer", () => {
    render(<VerifyCodePage />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Resend code in 25s")).toBeInTheDocument();
  });

  it("shows resend button after cooldown expires", () => {
    render(<VerifyCodePage />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(
      screen.getByRole("button", { name: /resend code/i })
    ).toBeInTheDocument();
  });

  it("calls resendCode and shows success message", async () => {
    resendCode.mockResolvedValue({ success: true });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByRole("button", { name: /resend code/i });
    await user.click(resendButton);

    expect(await screen.findByText("New code sent!")).toBeInTheDocument();
    expect(resendCode).toHaveBeenCalledWith("+12125551234");
  });

  it("resets cooldown timer after successful resend", async () => {
    resendCode.mockResolvedValue({ success: true });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByRole("button", { name: /resend code/i });
    await user.click(resendButton);

    await screen.findByText("New code sent!");
    expect(screen.getByText("Resend code in 30s")).toBeInTheDocument();
  });

  it("displays error message on failed resend", async () => {
    resendCode.mockResolvedValue({
      success: false,
      error: "Too many attempts. Please try again later.",
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VerifyCodePage />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByRole("button", { name: /resend code/i });
    await user.click(resendButton);

    expect(
      await screen.findByText("Too many attempts. Please try again later.")
    ).toBeInTheDocument();
  });

  it("renders change phone number link", () => {
    render(<VerifyCodePage />);

    const link = screen.getByRole("link", { name: /change phone number/i });
    expect(link).toHaveAttribute("href", "/verify-phone");
  });
});
