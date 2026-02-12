import { render, screen } from "@testing-library/react";
import HomePage from "../page";

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

jest.mock("@/lib/session", () => ({
  getSessionUserId: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// next/navigation redirect throws a special error to halt execution
const REDIRECT_ERROR = "NEXT_REDIRECT";

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(REDIRECT_ERROR) as Error & { digest: string };
    err.digest = `${REDIRECT_ERROR};${url}`;
    throw err;
  },
}));

/* ------------------------------------------------------------------ */
/*  Typed mock references                                             */
/* ------------------------------------------------------------------ */

const { getSessionUserId } = jest.requireMock("@/lib/session") as {
  getSessionUserId: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Call the async server component and render the returned JSX. */
async function renderHomePage() {
  const jsx = await HomePage();
  return render(jsx);
}

/**
 * Call the async server component expecting it to redirect.
 * Returns the redirect URL extracted from the thrown error digest.
 */
async function expectRedirect(): Promise<string> {
  try {
    await HomePage();
    throw new Error("Expected redirect but component rendered normally");
  } catch (err: unknown) {
    const error = err as Error & { digest?: string };
    if (error.message === REDIRECT_ERROR && error.digest) {
      // digest format: "NEXT_REDIRECT;/path"
      return error.digest.replace(`${REDIRECT_ERROR};`, "");
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----- Redirect scenarios -----

  it("redirects to /verify-phone when there is no session", async () => {
    getSessionUserId.mockResolvedValue(null);

    const url = await expectRedirect();

    expect(url).toBe("/verify-phone");
    // Prisma should not be called at all
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("redirects to /verify-phone when user is not found in DB", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);

    const url = await expectRedirect();

    expect(url).toBe("/verify-phone");
  });

  // ----- Render scenarios -----

  it("renders welcome message with the user's first name", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Alice",
    });
    prisma.user.findMany.mockResolvedValue([]);

    await renderHomePage();

    expect(
      screen.getByRole("heading", { name: /chats/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome, Alice")).toBeInTheDocument();
  });

  it("shows empty state when no other users exist", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Alice",
    });
    prisma.user.findMany.mockResolvedValue([]);

    await renderHomePage();

    expect(
      screen.getByText(/no other users yet/i)
    ).toBeInTheDocument();
  });

  it("renders user list when other users exist", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Alice",
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-2",
        firstName: "Bob",
        lastName: "Smith",
        profileImageUrl: null,
        onlineStatus: "ONLINE",
      },
      {
        id: "user-3",
        firstName: "Carol",
        lastName: null,
        profileImageUrl: "https://example.com/carol.jpg",
        onlineStatus: "OFFLINE",
      },
    ]);

    await renderHomePage();

    // User list is rendered
    expect(screen.getByRole("list")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    // Bob (online, no profile image -> shows initials)
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByLabelText("Online")).toBeInTheDocument();

    // Carol (offline, has profile image -- alt="" gives role "presentation")
    expect(screen.getByText("Carol")).toBeInTheDocument();
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "https://example.com/carol.jpg");
  });
});
