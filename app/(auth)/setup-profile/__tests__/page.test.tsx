import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SetupProfilePage from "../page";

const mockGet = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../actions", () => ({
  createProfile: jest.fn(),
}));

const { createProfile } = jest.requireMock("../actions") as {
  createProfile: jest.Mock;
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("SetupProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue("+12125551234");
  });

  it("renders fallback when no phone number is provided", () => {
    mockGet.mockReturnValue(null);
    renderWithProviders(<SetupProfilePage />);

    expect(screen.getByText("No phone number provided.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to phone verification/i })
    ).toHaveAttribute("href", "/verify-phone");
  });

  it("renders profile setup form", () => {
    renderWithProviders(<SetupProfilePage />);

    expect(
      screen.getByRole("heading", { name: /set up your profile/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save profile/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /choose profile photo/i })
    ).toBeInTheDocument();
  });

  it("shows validation error when first name is empty on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SetupProfilePage />);

    const button = screen.getByRole("button", { name: /save profile/i });
    await user.click(button);

    expect(
      await screen.findByText("First name is required.")
    ).toBeInTheDocument();
    expect(createProfile).not.toHaveBeenCalled();
  });

  it("calls createProfile and redirects on success", async () => {
    createProfile.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<SetupProfilePage />);

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText(/last name/i), "Doe");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await screen.findByText("Continue");

    expect(createProfile).toHaveBeenCalledWith({
      phoneNumber: "+12125551234",
      firstName: "John",
      lastName: "Doe",
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("calls createProfile without lastName when not provided", async () => {
    createProfile.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<SetupProfilePage />);

    await user.type(screen.getByLabelText("First name"), "John");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await screen.findByText("Continue");

    expect(createProfile).toHaveBeenCalledWith({
      phoneNumber: "+12125551234",
      firstName: "John",
      lastName: undefined,
    });
  });

  it("displays server error message on failure", async () => {
    createProfile.mockResolvedValue({
      success: false,
      error: "Phone number not verified.",
    });

    const user = userEvent.setup();
    renderWithProviders(<SetupProfilePage />);

    await user.type(screen.getByLabelText("First name"), "John");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(
      await screen.findByText("Phone number not verified.")
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
