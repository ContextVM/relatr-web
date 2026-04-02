# AGENTS.md

## Project overview

- [`relatr-web`](package.json) is a Bun-managed SvelteKit application using Svelte 5, TypeScript, Vite, and Tailwind CSS v4.
- The UI layer lives primarily in [`src/lib/components/`](src/lib/components/) and route entry points live in [`src/routes/`](src/routes/).
- Shared client logic is organized under [`src/lib/`](src/lib/), including queries, mutations, services, stores, and a [`RelatrClient`](src/lib/ctxcn/RelatrClient.ts) integration.

## Dev environment tips

- Use Bun for dependency and script execution in this repository.
- Install dependencies with `bun install`.
- Start the development server with `bun run dev`.
- Create a production build with `bun run build`.
- Preview the production build with `bun run preview`.
- Run framework and TypeScript checks with `bun run check`.
- Run formatting and lint checks with `bun run lint`.
- Format files with `bun run format`.

## Code style guidelines

- Follow the existing Prettier configuration in [`.prettierrc`](.prettierrc): tabs for indentation, single quotes, no trailing commas, and 100 character print width.
- Follow the linting rules in [`eslint.config.js`](eslint.config.js), including the Svelte, TypeScript, and Prettier integrations already configured for the project.
- Prefer TypeScript for shared logic and keep types explicit at module boundaries.
- Keep Svelte route files in [`src/routes/`](src/routes/) and reusable UI or domain code in [`src/lib/`](src/lib/).
- Reuse the component aliases defined in [`components.json`](components.json) such as `$lib`, `$lib/components`, and `$lib/components/ui` instead of deep relative imports when appropriate.
- Match the established naming conventions already present in the codebase, including kebab-case for many component directories and descriptive PascalCase component filenames.
- Minimize unrelated refactors; keep changes focused on the task being completed.

## Testing and verification instructions

- There is currently no dedicated `test` script in [`package.json`](package.json). Do not invent one.
- For validation, run the checks that exist for this repository:
  - `bun run check`
  - `bun run lint`
  - `bun run build` for changes that may affect bundling or production output
- After changing routes, stores, queries, or components, run the relevant validation commands before considering the task complete.
- If you add a new test framework or automated tests in the future, document the exact command here and in [`package.json`](package.json).

## Documentation expectations

- Update [`README.md`](README.md) when setup, scripts, or developer workflow materially change.
- Update the relevant documents in [`docs/`](docs/) or [`plans/`](plans/) when changing plugin behavior, protocol assumptions, or roadmap-aligned features.

## Pull request and commit guidance

- Keep commits focused and descriptive.
- Before committing, ensure the relevant validation commands pass.
- In PR descriptions or handoff notes, summarize:
  - what changed
  - how it was validated
  - any follow-up work or known limitations
