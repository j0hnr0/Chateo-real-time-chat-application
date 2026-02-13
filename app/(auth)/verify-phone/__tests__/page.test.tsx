import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("VerifyPhonePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders phone input, country code, and submit button", () => {
    renderWithProviders(<VerifyPhonePage />);

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.getByText("+63")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeInTheDocument();
  });

  it("updates phone input value on typing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "9171234567");

    expect(input).toHaveValue("9171234567");
  });

  it("displays error message on failure", async () => {
    sendVerificationCode.mockResolvedValue({
      success: false,
      error: "Invalid phone number format.",
    });

    const user = userEvent.setup();
    renderWithProviders(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "bad");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    expect(sendVerificationCode).toHaveBeenCalledWith("+63bad");
    expect(
      await screen.findByText("Invalid phone number format.")
    ).toBeInTheDocument();
  });

  it("redirects to verify-code on success with country code prepended", async () => {
    sendVerificationCode.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "9171234567");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    await screen.findByLabelText("Phone number");
    expect(sendVerificationCode).toHaveBeenCalledWith("+639171234567");
    expect(mockPush).toHaveBeenCalledWith(
      "/verify-code?phone=%2B639171234567"
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
    renderWithProviders(<VerifyPhonePage />);

    const input = screen.getByLabelText("Phone number");
    await user.type(input, "9171234567");

    const button = screen.getByRole("button", { name: /send/i });
    await user.click(button);

    expect(button).toBeDisabled();

    resolvePromise!({ success: true });
  });
});
