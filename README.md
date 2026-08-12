# Nuxt Calendar Template

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

An Apple Calendar-inspired template built with [Nuxt UI](https://ui.nuxt.com), featuring day, week and month views, drag and drop, optimistic updates and keyboard shortcuts.

- [Live demo](https://calendar-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://calendar-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/calendar-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/calendar-light.png">
    <img alt="Nuxt Calendar Template" src="https://ui.nuxt.com/assets/templates/nuxt/calendar-light.png" width="830" height="466">
  </picture>
</a>

## Features

- Day, week and month views with date-based routing (`/day/2026-08-11`, `/week/2026-08-11`, `/month/2026-08-11`)
- Infinitely scrolling month view virtualized with the ScrollArea component, the URL and title follow as you scroll
- Multi-day events rendered as spanning bars in the month view, like Apple Calendar
- Event creation, editing and deletion with optimistic updates
- Drag to move events across days, drag the bottom edge to resize, snapped to 15 minutes
- Multiple calendars with color coding and cookie-persisted visibility toggles
- Mini calendar with hover prefetching and current time indicator
- Offline support: mutations queue while offline and replay on reconnect, with an indicator in the header
- Keyboard shortcuts: `t` today, `d`/`w`/`m` switch views, `n` new event, arrow keys to navigate
- Dark mode and responsive layout, small screens show a 3-day window and the sidebar becomes a slideover

## Nuxt features showcased

- **Payload caching**: each visible range is a keyed `useFetch` with `getCachedData`, so revisiting a week or month renders instantly without a request. The adjacent ranges are warmed in the background after each navigation, a prev/next click never waits on the network. The month view streams events in aligned 6-week chunks as you scroll, sharing the same cache keys.
- **Route validation**: `definePageMeta({ validate })` turns invalid views or dates into a 404.
- **View transitions**: `experimental.viewTransition` slides the grid left or right on prev/next navigation.
- **Optimistic mutations with a client overlay**: creations, updates and deletions apply instantly to a `useState` overlay that is re-applied over every server response, with rollback and a toast on failure. The demo API stores events in memory, on serverless a mutation may land on a different instance than the next read, the overlay keeps the session coherent anyway (client-generated ids, upsert `PATCH`, idempotent `DELETE`). Swap in a database and the overlay still works, or can be removed.
- **Offline queue**: while offline (`useOnline`), mutations skip the network and queue for replay on reconnect. The upsert and idempotent server semantics make replaying in order safe.
- **Isomorphic validation**: the zod schema in `shared/` validates the form on the client and the request body in the Nitro route.
- **Seeded demo data**: `server/utils/store.ts` generates events relative to the current date with `date-fns`, so the demo never goes stale.

The overlap layout in `app/utils/layout.ts` is a small pure function using the same cluster and column-packing approach as Google Calendar. The month view reuses its lane-packing helper to render multi-day events as spanning bars per week row.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t ui/calendar
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=calendar&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fcalendar&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fcalendar-dark.png&demo-url=https%3A%2F%2Fcalendar-template.nuxt.dev%2F&demo-title=Nuxt%20Calendar%20Template&demo-description=A%20Google%20Calendar-like%20template%20built%20with%20Nuxt%20UI.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

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
