# CRM Platform Frontend

The web client for the CRM Platform, built with Next.js 14 (App Router), React 18, and TypeScript. It implements the "Linen & Logic" design system (Editorial Minimalism with tactile accents) and communicates with the FastAPI backend via a generated OpenAPI TypeScript client.

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **Package Manager**: `pnpm` (recommended) or `npm`

---

## Installation & Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```
   Or with npm:
   ```bash
   npm install
   ```

---

## Environment Variables

The application configures its API connection via environment variables.

Copy `.env.example` (or create `.env.local`) for local development:
```bash
cp .env.example .env.local
```

### Supported Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Base URL of the backend API service |

> **Note**: Secrets must stay server-side. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## Running the Application

### Development Server

Start the local development server with hot reloading:

```bash
pnpm dev
```
Or with npm:
```bash
npm run dev
```

Once running, navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the optimized application for production:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

---

## Testing & Quality Assurance

### Unit & Component Tests

Run component and unit tests using [Vitest](https://vitest.dev/):

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### End-to-End Tests

Run end-to-end integration tests using [Playwright](https://playwright.dev/):

```bash
pnpm test:e2e
```

### Code Quality & Static Analysis

All code must pass linting and type checks without errors or warnings:

```bash
# Run ESLint
pnpm lint

# Run TypeScript type check
pnpm typecheck
```

---

## API Client Generation

The frontend uses an OpenAPI-generated TypeScript client to ensure contract safety with the backend.

When the backend API specification changes in `contracts/openapi.json`, regenerate the client definitions:

```bash
pnpm gen:api
```

This updates `src/services/schema.d.ts` based on `contracts/openapi.json`. Never hand-edit generated schema files.

---

## Directory Structure

```text
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages and layouts
│   ├── components/             # Reusable UI components (shared & feature-specific)
│   ├── services/               # API service functions wrapping generated OpenAPI client
│   └── lib/                    # Design tokens, formatters, and client-only utilities
├── tests/                      # Component and unit tests (mirroring src/ structure)
├── package.json                # Dependencies and scripts
└── README.md                   # Frontend documentation
```
