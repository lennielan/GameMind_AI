# Coding Standards

## General
- Strictly adhere to **TypeScript**. Avoid `any` unless absolutely necessary (e.g., when parsing unknown 3rd party API responses, but prefer `unknown` and Zod validation).
- Use **ESLint** and **Prettier** for formatting.

## React (Renderer)
- Strictly follow the **Neo-Terminal / Industrial Tech** design system specified in `DESIGN_RULES.md`.
- Use functional components and Hooks.
- Use BEM-like naming conventions for CSS or utility classes matching `DESIGN_RULES.md`.
- Component files should be named in PascalCase (e.g., `GameCard.tsx`).
- Extract complex logic into custom hooks.
- Use `useTranslation` hook for ALL text strings. Do not hardcode English/Russian strings in the UI.
- All numbers, statistics, timers, and telemetry metrics MUST use `font-mono tabular-nums`.
- Strict prohibition on emojis in UI text, notifications, or logs.

## Backend (Main)
- Use the Singleton pattern for Services and Repositories.
- IPC Handlers should be thin: they should extract parameters, call a Service, and return the result.
- Handle all errors gracefully. Throwing an unhandled promise rejection crashes the Electron app.

## File Naming
- Components: `PascalCase.tsx`
- Services/Utils: `kebab-case.ts`
- Repositories: `entity.repository.ts`
- IPC Handlers: `feature.ipc.ts`
