"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { createProfile } from "./actions";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
}

export default function SetupProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phoneNumber = searchParams.get("phone") ?? "";

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: { firstName: "", lastName: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      createProfile({
        phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName || undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        router.push("/");
      }
    },
  });

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

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  const serverError =
    mutation.data && !mutation.data.success ? mutation.data.error : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold">Set up your profile</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Add your name and a profile photo
        </p>

        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label="Choose profile photo"
            className="relative h-24 w-24 overflow-hidden rounded-full
                       border-2 border-dashed border-gray-300
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-blue-500
                       dark:border-gray-600"
            style={{ touchAction: "manipulation" }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile preview"
                className="h-full w-full object-cover"
                width={96}
                height={96}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center
                               text-gray-400 dark:text-gray-500">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="firstName"
              className="mb-1 block text-sm font-medium"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              {...register("firstName", {
                required: "First name is required.",
                maxLength: {
                  value: 50,
                  message: "First name must be 50 characters or less.",
                },
              })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         text-base placeholder:text-gray-400
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500
                         dark:border-gray-700 dark:bg-gray-900"
              style={{ touchAction: "manipulation" }}
            />
            {errors.firstName && (
              <p role="alert" className="mt-1 text-sm text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="mb-1 block text-sm font-medium"
            >
              Last name (optional)
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              {...register("lastName", {
                maxLength: {
                  value: 50,
                  message: "Last name must be 50 characters or less.",
                },
              })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         text-base placeholder:text-gray-400
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-500
                         dark:border-gray-700 dark:bg-gray-900"
              style={{ touchAction: "manipulation" }}
            />
            {errors.lastName && (
              <p role="alert" className="mt-1 text-sm text-red-500">
                {errors.lastName.message}
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
            aria-label="Save profile"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base
                       font-medium text-white
                       hover:bg-blue-700
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       disabled:cursor-not-allowed disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {mutation.isPending ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
