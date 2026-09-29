# CRM Platform Foundation - Frontend

Next.js (App Router) + React + TypeScript frontend for the CRM Platform Foundation. Serves as the UI shell and component library for Companies, Contacts, Leads, Tasks, Interactions, and Dashboard workflows.

> For full application setup, API documentation links, and container deployment runbook, see the root [README.md](../README.md).

## Prerequisites

- **Node.js**: 20.0.0 or higher
- **Package Manager**: `pnpm` (recommended) or `npm`

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # Or using npm:
   # npm install
   ```

## Environment Variables

Copy `.env.example` to `.env.local` in the `frontend` directory (or create `.env.local` if `.env.example` is not present):

```bash
cp .env.example .env.local
```

### Available Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the backend REST API | `http://localhost:8000` |

*Note: In Next.js, variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Do not store sensitive credentials in client-facing environment variables.*

## Running the Application

### Development Server

To start the Next.js development server with hot reloading:

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Production Build

To build the application for production:

```bash
pnpm build
```

To run the built production application:

```bash
pnpm start
```

## Testing and Code Quality

### Unit & Integration Tests (Vitest)

Run the Vitest test suite once:

```bash
pnpm test
```

Run tests with coverage report:

```bash
pnpm test:coverage
```

Run tests in watch mode during development:

```bash
pnpm test:watch
```

Run a specific test file:

```bash
pnpm test tests/components/shared/StatusBadge.test.tsx
```

### End-to-End Tests (Playwright)

Run E2E tests across supported browser engines:

```bash
pnpm test:e2e
```

### Linting and Type Checking

Run ESLint to check for code style and potential issues:

```bash
pnpm lint
```

Run TypeScript compiler type-checking without emitting files:

```bash
pnpm typecheck
```

Both `pnpm lint` and `pnpm typecheck` must pass without errors or warnings before committing code.

## Generating API Client

The frontend consumes backend REST endpoints through a generated TypeScript schema client located at `src/services/schema.d.ts`.

When backend API endpoints or models change, regenerate the client types from the root OpenAPI contract:

```bash
pnpm gen:api
```

This updates `src/services/schema.d.ts` based on `contracts/openapi.json`. Never hand-edit the generated schema file or `contracts/openapi.json`.

## Project Structure

```text
frontend/
├── src/
│   ├── app/          # Next.js App Router pages and layouts (UI shell)
│   ├── components/   # Shared React components (CRMLayout, StatusBadge, Dialogs, etc.)
│   ├── services/     # API service client and OpenAPI integration (only place calling API)
│   └── lib/          # Design tokens, formatting utilities, and frontend helpers
├── tests/            # Vitest unit & component tests mirroring src/ structure
└── package.json      # Dependencies and scripts configuration
```

## Architecture Principles

- **Server Components by default**: Use `'use client'` only when interactivity or state management is required, pushed as far down the tree as possible.
- **Isolated API Calls**: All backend calls are made via `src/services/` using the generated client. Never use hand-written `fetch` calls in components.
- **Design System Rules**: Follow design tokens in `src/lib/tokens.ts` for spacing, typography, and colors. Do not hardcode custom hex colors or layout values.
