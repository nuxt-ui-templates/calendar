# Nuxt Calendar Template

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Apple Calendar-inspired application with day, week and month views, drag and drop, optimistic updates, offline support, keyboard shortcuts, light & dark mode and more. Built using [Nuxt UI](https://ui.nuxt.com) components on top of Nuxt's payload caching, route validation and view transitions.

- [Live demo](https://calendar-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://calendar-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/calendar-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/calendar-light.png">
    <img alt="Nuxt Calendar Template" src="https://ui.nuxt.com/assets/templates/nuxt/calendar-light.png">
  </picture>
</a>

## Features

- **Day, week and month views** - Date-based routing (`/day/2026-08-11`, `/week/2026-08-11`, `/month/2026-08-11`) with `definePageMeta({ validate })` turning invalid views or dates into a 404
- **Infinite month scrolling** - Virtualized with the [`ScrollArea`](https://ui.nuxt.com/docs/components/scroll-area) component, streaming events in aligned 6-week chunks while the URL and title follow as you scroll
- **Drag and drop** - Move events across days, drag the bottom edge to resize, snapped to 15 minutes
- **Inline event editing** - Double-click or drag the grid to draw an event where you point, across days for an all-day one, then fill it in from a popover anchored to it, the same form an existing event opens into
- **Optimistic mutations** - Creations, edits and deletions apply instantly to a client overlay re-applied over every server response, with rollback and a toast on failure
- **Offline support** - Mutations queue while offline and replay on reconnect thanks to upsert and idempotent server semantics, with an indicator in the header
- **Payload caching** - Each visible range is a keyed `useFetch` with `getCachedData`, adjacent ranges are warmed in the background so a prev/next click never waits on the network
- **View transitions** - `experimental.viewTransition` slides the grid left or right on prev/next navigation
- **Multiple calendars** - Color coding with cookie-persisted visibility toggles, plus a mini calendar with hover prefetching
- **Shared contract** - The event types, the zod schema the Nitro routes validate against and the floating local datetime helper both sides write with all live in `shared/`, so client and server never disagree on what a date string means
- **Keyboard shortcuts** - `t` for today, `d`/`w`/`m` to switch views, `n` for a new event, arrow keys to navigate
- **Responsive layout** - Small screens show a 3-day window and the sidebar becomes a slideover

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t ui/calendar
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=calendar&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fcalendar&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fcalendar-dark.png&demo-url=https%3A%2F%2Fcalendar-template.nuxt.dev%2F&demo-title=Nuxt%20Calendar%20Template&demo-description=An%20Apple%20Calendar-inspired%20template%20with%20day%2C%20week%20and%20month%20views%2C%20drag%20and%20drop%20and%20optimistic%20updates.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

> [!NOTE]
> The demo API stores events in memory and `server/utils/store.ts` seeds them relative to the current date, so the demo never goes stale. Swap it for a database and the client overlay keeps working, or can be removed.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
