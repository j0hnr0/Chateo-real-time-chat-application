import type { OnlineStatus } from "@prisma/client";

interface UserListProps {
  users: {
    id: string;
    firstName: string;
    lastName: string | null;
    profileImageUrl: string | null;
    onlineStatus: OnlineStatus;
  }[];
}

export function UserList({ users }: UserListProps) {
  return (
    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800">
      {users.map((user) => (
        <li key={user.id}>
          <div className="flex items-center gap-3 py-3">
            <div className="relative h-12 w-12 shrink-0">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full
                             bg-blue-100 text-sm font-medium text-blue-600
                             dark:bg-blue-900 dark:text-blue-300"
                  aria-hidden="true"
                >
                  {user.firstName[0]?.toUpperCase()}
                  {user.lastName?.[0]?.toUpperCase() ?? ""}
                </div>
              )}
              {user.onlineStatus === "ONLINE" && (
                <span
                  className="absolute bottom-0 right-0 h-3 w-3 rounded-full
                             border-2 border-white bg-green-500
                             dark:border-gray-900"
                  aria-label="Online"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {user.firstName}
                {user.lastName ? ` ${user.lastName}` : ""}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.onlineStatus === "ONLINE" ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
