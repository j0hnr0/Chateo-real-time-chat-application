# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chateo — a real-time 1-on-1 chat application with phone number authentication, message reactions, read receipts, and stories.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint
- `npm run test` — run all tests
- `npm run test:watch` — run tests in watch mode
- `npx jest --testPathPatterns="<pattern>"` — run specific test file (e.g., `"actions.test"`, `"page.test"`)

## Tech Stack

- **Next.js 16** with App Router and React 19
- **TypeScript** (strict mode)
- **Tailwind CSS v4** via PostCSS
- **Prisma 7** ORM + **PostgreSQL**
- **Geist** font family (Sans + Mono)
- **React Hook Form** for client-side form state and validation
- **TanStack React Query** for server state management and data fetching
- **jose** for JWT-based session (signed tokens in httpOnly cookies)
- **Jest 30** + **Testing Library** (React, jest-dom, user-event) with jsdom environment

## Architecture

- `app/` — Next.js App Router (file-based routing, server components by default)
- `public/` — static assets
- Import alias: `@/*` maps to project root
- ESLint: Next.js core-web-vitals + TypeScript rules
- Dark mode: CSS `prefers-color-scheme` media query with custom properties in `globals.css`
- `prisma.config.ts` — Prisma 7 config (datasource URL, migration path); DB URL lives here, **not** in schema.prisma
- `prisma/schema.prisma` — data model (no `url` in datasource block — Prisma 7 requirement)
- `lib/prisma.ts` — Prisma client singleton (prevents multiple instances in dev)
- `lib/session.ts` — JWT session utilities (`createSession`, `getSessionUserId`, `verifyToken`, `clearSession`) using `jose`; stores signed JWT in httpOnly cookie `chateo-session`
- `proxy.ts` — route protection (Next.js 16 proxy convention); redirects unauthenticated users to `/verify-phone`, redirects authenticated users away from auth pages
- Place all related files (components, hooks, lib, types) inside the route folder they belong to.
- Only promote to root-level components/, lib/, hooks/, or types/ when shared across multiple routes.
- Never import from another route's internal files — promote to shared instead.
- Use @/ alias for all imports.

## Data Model

- **VerificationCode** — linked to phone number (not user), since user doesn't exist during signup
- **User** — created after phone verification; profile setup (firstName required, lastName/avatar optional), theme preference, online status
- **Conversation** — 1-on-1 only; two user FKs with `user1Id < user2Id` convention to prevent duplicates
- **Message** — text/image/file; soft delete (`isDeleted`); edit tracking (`isEdited`/`editedAt`)
- **MessageRead** — read receipts; unique per `[messageId, userId]`
- **MessageReaction** — one emoji per user per message; unique per `[messageId, userId]`
- **Story** / **StoryView** — 24-hour expiring stories with view tracking

### Database commands

- `npx prisma migrate dev --name <name>` — create and apply migration
- `npx prisma generate` — regenerate Prisma Client types
- `npx prisma studio` — visual database browser

## Code Style & Best Practices

### React & Next.js

- **Server Components by default** — only add `"use client"` when the component needs hooks, event handlers, or browser APIs
- **Parallelize data fetching** — use `Promise.all()` for independent queries; never `await` sequentially when requests are independent
- **Use `React.cache()`** for per-request deduplication of repeated data fetches in server components
- **Use `after()`** from `next/server` for non-blocking work (analytics, logging) that shouldn't delay the response
- **Avoid barrel imports** — import directly from the specific module (e.g., `lucide-react/icons/Send` not `lucide-react`)
- **Dynamic imports** for heavy components — use `next/dynamic` for components not needed on initial render
- **Functional state updates** — use `setState(prev => ...)` not `setState(value)` to avoid stale closures
- **Derived state** — calculate during render instead of syncing with `useEffect`
- **Use `useRef`** for values that don't need to trigger re-renders (timers, WebSocket refs, previous values)
- **Use `useTransition`** for non-urgent updates to keep the UI responsive

### TypeScript

- Prefer `interface` over `type` for object shapes (better error messages, extendability)
- Export types alongside their components; co-locate, don't centralize
- Use `as const` for literal unions instead of enums

### Tailwind CSS & UI

- **Mobile-first** — use unprefixed classes for mobile, `sm:` / `md:` / `lg:` for larger screens
- All interactive elements need visible `focus-visible:ring-*` styles
- Use `<button>` for actions, `<Link>` for navigation — never `<div onClick>`
- Icon-only buttons require `aria-label`
- Form inputs require `<label>` or `aria-label`
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>`) before ARIA
- Text containers must handle overflow: `truncate`, `line-clamp-*`, or `break-words`
- Flex children need `min-w-0` to allow text truncation
- Apply `touch-action: manipulation` on tap targets (removes 300ms delay)
- Use `overscroll-behavior: contain` on scrollable panels (chat messages, modals)
- Set `color-scheme: dark` on `<html>` when dark mode is active
- Respect `prefers-reduced-motion` — animate only `transform`/`opacity`, never `transition: all`
- Handle empty states — don't render broken UI for null/empty values

### Chat-Specific

- Virtualize message lists when they exceed ~50 messages
- Images need explicit `width`/`height` to prevent layout shift
- Below-fold images use `loading="lazy"`
- Destructive actions (delete message, leave conversation) require confirmation
- Async status updates (sent, delivered, read) should use `aria-live="polite"`
- Dates/times use `Intl.DateTimeFormat` — never hardcode formats

### Performance

- Never read layout properties (`offsetHeight`, `getBoundingClientRect`) during render
- Batch DOM reads/writes — don't interleave them
- Prefer uncontrolled inputs for search/filter; controlled inputs must be performant per keystroke
- Use `Set`/`Map` for O(1) lookups instead of `Array.find`/`Array.includes` on large collections

### Database (Prisma + PostgreSQL)

- **Index foreign keys** — Prisma does not auto-create indexes on FK columns; add `@@index` on columns used in `WHERE`/`JOIN` (e.g., `Message.conversationId`, `MessageRead.messageId`, `MessageReaction.messageId`, `StoryView.storyId`)
- **Keyset pagination** for chat messages — use Prisma's `cursor` instead of `skip`/`take` for large conversations (offset pagination degrades as pages grow)
- **Keep transactions short** — minimize work inside `prisma.$transaction()` to avoid lock contention, especially around message operations
- **Prefer `cuid()` over `uuid()`** for primary keys — UUIDs fragment B-tree indexes; CUIDs are sortable and index-friendly
- **Use `select` to fetch only needed fields** — avoid fetching entire rows when you only need a few columns (especially for message lists)
- **Use `include` deliberately** — don't over-fetch relations; only include what the current view needs
- **Batch writes with `createMany`/`updateMany`** — avoid loops of individual `create`/`update` calls
- **Add `@@index` on columns used for filtering/sorting** — e.g., `Message.createdAt` for chronological queries, `Story.expiresAt` for expiry checks

### Authentication & Session

- **JWT session** via `jose` — signed HS256 tokens stored in httpOnly cookie (`chateo-session`)
- `lib/session.ts` is the single source of truth for session operations
- Server actions that create/log in users must call `createSession(userId)` to set the cookie
- Server components read the session with `getSessionUserId()` — returns `userId` or `null`
- Middleware uses `verifyToken(token)` directly (middleware can't use `cookies()` from `next/headers`)
- `JWT_SECRET` env var is required — used to sign/verify tokens
- Public (unauthenticated) routes: `/verify-phone`, `/verify-code`, `/setup-profile`

### Security

- Authenticate Server Actions like API routes — never trust the client
- Validate and sanitize all user input at system boundaries
- Never expose database IDs or internal errors to the client
