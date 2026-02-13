"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { sendVerificationCode } from "./actions";

const COUNTRY_CODE = "+63";

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
    mutationFn: (data: PhoneFormValues) => {
      const fullNumber = `${COUNTRY_CODE}${data.phoneNumber}`;
      return sendVerificationCode(fullNumber);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        const fullNumber = `${COUNTRY_CODE}${variables.phoneNumber}`;
        router.push(
          `/verify-code?phone=${encodeURIComponent(fullNumber)}`
        );
      }
    },
  });

  const serverError =
    mutation.data && !mutation.data.success ? mutation.data.error : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[327px]">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold leading-none text-[#0F1828] dark:text-white">
            Enter Your Phone Number
          </h1>
          <p className="text-sm leading-5 text-[#ADB5BD] dark:text-white/60">
            Please confirm your country code and enter your phone number
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-8"
        >
          <div>
            <div
              className="flex h-12 items-center rounded-lg bg-[#F7F7FC]
                         dark:bg-gray-800"
            >
              <div className="flex shrink-0 items-center gap-2 px-3">
                <div
                  className="flex size-6 items-center justify-center overflow-hidden rounded"
                  aria-hidden="true"
                >
                  <div className="size-full">
                    <div className="h-1/2 w-full bg-[#FF0000]" />
                    <div className="h-1/2 w-full bg-white" />
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#ADB5BD]">
                  {COUNTRY_CODE}
                </span>
              </div>

              <div className="h-5 w-px bg-[#ADB5BD]/30" />

              <input
                id="phone"
                type="tel"
                placeholder="Phone Number"
                autoComplete="tel"
                aria-label="Phone number"
                {...register("phoneNumber", {
                  required: "Phone number is required.",
                })}
                className="h-full min-w-0 flex-1 bg-transparent px-3
                           text-sm font-semibold text-[#0F1828]
                           placeholder:text-[#ADB5BD]
                           focus-visible:outline-none
                           dark:text-white"
                style={{ touchAction: "manipulation" }}
              />
            </div>
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
            className="w-full rounded-[30px] bg-[#002DE3] px-12 py-3 text-base
                       font-semibold leading-7 text-[#F7F7FC]
                       hover:bg-[#0024B5]
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#002DE3] focus-visible:ring-offset-2
                       disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {mutation.isPending ? "Continuing..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
