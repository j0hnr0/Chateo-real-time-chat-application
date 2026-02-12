# Test Infrastructure

- **Framework**: Jest 30 with jsdom, next/jest transformer
- **Libraries**: @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
- **Config**: `jest.config.ts` uses `nextJest({ dir: "./" })`, module alias `@/*` mapped to `<rootDir>/*`
- **Setup**: `jest.setup.ts` imports `@testing-library/jest-dom`
- **Run command**: `npx jest --testPathPatterns="<pattern>"` (Jest 30 uses plural flag)
- **Test location**: `__tests__/` folders co-located next to source files

## Patterns (from verify-phone and verify-code tests)

### Server Action Tests (`actions.test.ts`)
- Mock `@/lib/prisma` and `@/lib/twilio` with `jest.mock` at module level
- Use `jest.requireMock` to get typed mock references
- Twilio mock structure: `getTwilio()` returns `{ verify: { v2: { services: () => ({ verifications/verificationChecks: { create: mockFn } }) } } }`
- Test categories: input validation, rate limiting, Twilio calls, DB operations, error handling
- `console.error` output in error-handling tests is expected (source code logs errors before returning)

### Page Component Tests (`page.test.tsx`)
- Mock `next/navigation` (useRouter, useSearchParams)
- Mock `./actions` module
- Use `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })` when combining userEvent with fake timers
- Use `jest.useFakeTimers()` in beforeEach, `jest.useRealTimers()` in afterEach
- Use `act(() => { jest.advanceTimersByTime(ms) })` for timer-based UI changes
- Worker force-exit warning is benign with fake timers -- no action needed

### Async Server Component Tests (`app/__tests__/page.test.tsx`)
- Call component as function: `const jsx = await HomePage()` then `render(jsx)`
- Mock `next/navigation` redirect to throw with `digest` property: `NEXT_REDIRECT;/path`
- To assert redirect: catch the error and parse `error.digest` for the URL
- Mock `@/lib/session` (`getSessionUserId`) and `@/lib/prisma` at module level
- Images with `alt=""` get role `presentation`, not `img` -- use `getByRole("presentation")`

## Validation helpers
- `@/lib/validation.ts`: `isValidE164` (E.164 regex) and `isValidOtp` (6-digit numeric)
