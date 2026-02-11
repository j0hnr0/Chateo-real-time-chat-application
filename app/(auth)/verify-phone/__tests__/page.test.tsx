import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerifyPhonePage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../actions", () => ({
  sendVerificationCode: jest.fn(),
}));

const { sendVerificationCode } = jest.requireMock("../actions") as {
  sendVerificationCode: jest.Mock;
};

describe("VerifyPhonePage", () => {
  it("renders phone input and submit button", () => {
    render(<VerifyPhonePage />);

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeInTheDocument();
  });

  it("updates phone input value on typing", async () => {
    const user = userEvent.setup();
    render(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "+12125551234");

    expect(input).toHaveValue("+12125551234");
  });

  it("displays error message on failure", async () => {
    sendVerificationCode.mockResolvedValue({
      success: false,
      error: "Invalid phone number format.",
    });

    const user = userEvent.setup();
    render(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "bad");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    expect(
      await screen.findByText("Invalid phone number format.")
    ).toBeInTheDocument();
  });

  it("redirects to verify-code on success", async () => {
    sendVerificationCode.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "+12125551234");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    await screen.findByLabelText("Phone number");
    expect(mockPush).toHaveBeenCalledWith(
      "/verify-code?phone=%2B12125551234"
    );
  });

  it("disables button while submitting", async () => {
    let resolvePromise: (value: unknown) => void;
    sendVerificationCode.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const user = userEvent.setup();
    render(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "+12125551234");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    expect(button).toBeDisabled();

    resolvePromise!({ success: true });
  });
});
