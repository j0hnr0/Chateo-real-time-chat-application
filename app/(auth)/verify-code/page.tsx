"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyCode, resendCode } from "./actions";

function maskPhone(phone: string): string {
  if (phone.length <= 5) return phone;
  const start = phone.slice(0, 2);
  const end = phone.slice(-4);
  const masked = "*".repeat(phone.length - 6);
  return `${start}${masked}${end}`;
}

export default function VerifyCodePage() {
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendCooldown]);

  if (!phoneNumber) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            No phone number provided.
          </p>
          <Link
            href="/verify-phone"
            className="text-blue-600 hover:underline focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-blue-500
                       dark:text-blue-400"
          >
            Go to phone verification
          </Link>
        </div>
      </main>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await verifyCode(phoneNumber, code);
      if (result.success) {
        setMessage({ type: "success", text: "Phone verified!" });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Verification failed.",
        });
      }
    });
  }

  function handleResend() {
    setMessage(null);
    startResendTransition(async () => {
      const result = await resendCode(phoneNumber);
      if (result.success) {
        setMessage({ type: "success", text: "New code sent!" });
        setResendCooldown(30);
        setCode("");
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Failed to resend.",
        });
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/verify-phone"
          className="mb-4 inline-flex items-center text-sm text-blue-600
                     hover:underline focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-blue-500
                     dark:text-blue-400"
        >
          &larr; Change phone number
        </Link>

        <h1 className="mb-2 text-2xl font-semibold">
          Enter verification code
        </h1>

        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          We sent a code to {maskPhone(phoneNumber)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setCode(val);
              }}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         text-center text-2xl tracking-[0.5em]
                         placeholder:text-gray-400 placeholder:tracking-[0.5em]
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
            disabled={isPending || code.length !== 6}
            aria-label="Verify code"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base
                       font-medium text-white
                       hover:bg-blue-700
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {isPending ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {resendCooldown > 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Resend code in {resendCooldown}s
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-blue-600 hover:underline
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500 dark:text-blue-400
                         disabled:opacity-50"
              style={{ touchAction: "manipulation" }}
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
