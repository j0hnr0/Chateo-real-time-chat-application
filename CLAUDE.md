# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chateo — a real-time 1-on-1 chat application with phone number authentication, message reactions, read receipts, and stories.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint (no test framework configured yet)

## Tech Stack

- **Next.js 16** with App Router and React 19
- **TypeScript** (strict mode)
- **Tailwind CSS v4** via PostCSS
- **Prisma 7** ORM + **PostgreSQL**
- **Geist** font family (Sans + Mono)

## Architecture

- `app/` — Next.js App Router (file-based routing, server components by default)
- `public/` — static assets
- Import alias: `@/*` maps to project root
- ESLint: Next.js core-web-vitals + TypeScript rules
- Dark mode: CSS `prefers-color-scheme` media query with custom properties in `globals.css`
- `prisma.config.ts` — Prisma 7 config (datasource URL, migration path); DB URL lives here, **not** in schema.prisma
- `prisma/schema.prisma` — data model (no `url` in datasource block — Prisma 7 requirement)
- `lib/prisma.ts` — Prisma client singleton (prevents multiple instances in dev)

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
