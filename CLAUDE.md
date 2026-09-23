## Project

`react-component-test-suite` — consistent, reusable test suites for React components in Jest or Vitest, naming each `describe` block after the component under test. Published to npm, bundled by tsdown.

- **Layout**: `src/component-suite.tsx` is the entrypoint, `src/utils.ts` its helpers; unit tests live in `src/__tests__/` with shared fixtures in `src/__tests__/__helpers__/`.
- **Peers**: `react`, `@types/react`, and the Testing Library packages are peers; `vitest` and `jest` are optional peers, so nothing may import either test runner at module scope.

## Code conventions

Conventions live outside this file, synced from https://github.com/bvandrc/bvandrc-conventions — follow all of them:

@conventions/typescript.md — language-level TypeScript/JavaScript rules
@conventions/ts-unit-testing.md — unit test layout, naming, fixtures, and assertions
@conventions/all.md — practice for every repo: branches, formatting, markdown, PR reviews

## Commands

- `pnpm build` — tsdown bundle. `pnpm start` — tsdown in watch mode.
- `pnpm format` — Biome check/fix. `pnpm check` — the full gate: Biome plus `pnpm ts:check` (`tsc --noEmit`); it's what CI runs.
- `pnpm test` — Vitest on happy-dom. `pnpm test:watch`, `pnpm test:coverage`.

## Repo conventions

- **Package manager**: pnpm. `npm install` writes a competing `package-lock.json` that CI ignores.
- **Convention files**: `conventions/` is synced from https://github.com/bvandrc/bvandrc-conventions by `.github/workflows/sync-conventions.yml` and overwritten on every sync. Edit a rule upstream, never in that directory.
