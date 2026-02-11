"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendVerificationCode } from "./actions";

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await sendVerificationCode(phoneNumber);

      if (result.success) {
        router.push(
          `/verify-code?phone=${encodeURIComponent(phoneNumber)}`
        );
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Something went wrong.",
        });
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">
          Enter your phone number
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              name="phoneNumber"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoComplete="tel"
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         text-base placeholder:text-gray-400
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500
                         dark:border-gray-700 dark:bg-gray-900"
              style={{ touchAction: "manipulation" }}
            />
          </div>

          {message && (
            <p
              role="alert"
              className={
                message.type === "error"
                  ? "text-sm text-red-500"
                  : "text-sm text-green-600"
              }
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            aria-label="Send verification code"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base
                       font-medium text-white
                       hover:bg-blue-700
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {isPending ? "Sending..." : "Send Code"}
          </button>
        </form>
      </div>
    </main>
  );
}
