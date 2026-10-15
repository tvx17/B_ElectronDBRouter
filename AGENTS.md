# Repository Guidelines

## Project Structure & Module Organization

This boilerplate uses Quasar, Vue 3, TypeScript, Pinia, and Vue I18n.
Application code lives in `src/`: reusable components in `components/`,
filename-based routes in `pages/`, router setup in `router/`, state in
`stores/`, translations in `i18n/`, and initialization in `boot/`.
Styles belong in `src/css/`; imported assets belong in `src/assets/`, while
`public/` contains files served directly. Electron main/preload code and desktop
icons live in `src-electron/`; PWA configuration lives in `src-pwa/`.
Configure builds in `quasar.config.ts`. Treat `.quasar/` and `dist/` as generated.

## Build, Test, and Development Commands

Use a Node.js version supported by `package.json`, such as Node 24.

- `npm install`: install dependencies and run Quasar preparation.
- `npm run dev`: start the browser development server with hot reload.
- `npm run dev -- -m electron`: start Electron development mode.
- `npm run build`: produce the production web build.
- `npm run build -- -m electron`: build and package the desktop app.
- `npm run typecheck`: check Vue and TypeScript types without emitting files.
- `npm run lint:check`: check formatting and lint rules without modifying files.
- `npm run lint`: format files and apply automatic lint fixes; review the diff.

## Coding Style & Naming Conventions

Use two-space indentation, UTF-8, LF endings, and a final newline.
Oxfmt enforces double quotes, semicolons, no trailing commas, and an 80-column
print width. Oxlint enables TypeScript and Vue checks, including type-aware rules.
Follow existing Vue single-file components using `<script setup lang="ts">`.
Use PascalCase component filenames, camelCase variables/functions, and descriptive
TypeScript interfaces. Preserve route filename conventions such as
`index.vue`, `(index).vue`, and `[...path].vue`. Do not manually edit generated
`src/router/typed-router.d.ts`.

## Testing Guidelines

No automated test framework, test script, or coverage threshold is currently
configured. Before submitting changes, run `npm run lint:check`,
`npm run typecheck`, and `npm run build`. Manually verify affected routes and UI
behavior; check Electron or PWA mode when changing their code. Document manual
checks in the pull request. Establish test naming conventions when adding a runner.

## Commit & Pull Request Guidelines

Git history contains only initialization commits, so no formal message convention
is established. Write concise, imperative commit subjects describing the change.
Keep pull requests focused, explain the behavior and rationale, link relevant
issues, and report validation results. Include screenshots for visible UI changes.
Never commit secrets, `.env` files, dependency directories, or generated builds.
