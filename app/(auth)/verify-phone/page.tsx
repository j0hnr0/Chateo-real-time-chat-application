"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { sendVerificationCode } from "./actions";

interface PhoneFormValues {
  phoneNumber: string;
}

export default function VerifyPhonePage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormValues>({
    defaultValues: { phoneNumber: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: PhoneFormValues) =>
      sendVerificationCode(data.phoneNumber),
    onSuccess: (result, variables) => {
      if (result.success) {
        router.push(
          `/verify-code?phone=${encodeURIComponent(variables.phoneNumber)}`
        );
      }
    },
  });

  const serverError =
    mutation.data && !mutation.data.success ? mutation.data.error : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">
          Enter your phone number
        </h1>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              autoComplete="tel"
              {...register("phoneNumber", {
                required: "Phone number is required.",
              })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         text-base placeholder:text-gray-400
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500
                         dark:border-gray-700 dark:bg-gray-900"
              style={{ touchAction: "manipulation" }}
            />
            {errors.phoneNumber && (
              <p role="alert" className="mt-1 text-sm text-red-500">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-500">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            aria-label="Send verification code"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base
                       font-medium text-white
                       hover:bg-blue-700
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {mutation.isPending ? "Sending..." : "Send Code"}
          </button>
        </form>
      </div>
    </main>
  );
}
