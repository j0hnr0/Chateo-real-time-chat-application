import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserList } from "./user-list";

export default async function HomePage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/verify-phone");
  }

  const [currentUser, users] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true },
    }),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        onlineStatus: true,
      },
      orderBy: { firstName: "asc" },
    }),
  ]);

  if (!currentUser) {
    redirect("/verify-phone");
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Chats</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Welcome, {currentUser.firstName}
        </p>
      </header>

      {users.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No other users yet. Share the app to start chatting!
          </p>
        </div>
      ) : (
        <UserList users={users} />
      )}
    </main>
  );
}
