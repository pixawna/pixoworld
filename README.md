# Pixo

Pixo is a tiny digital companion who lives with you while you work. He remembers you, cares about your day, helps you focus, and grows alongside you.

## What is included

- A customizable companion profile and focus length
- A focus timer with session, minutes, streak, XP, and level tracking
- A gentle daily task list with add, complete, and delete actions
- A daily mood check-in and a small memory timeline
- Optional ambient room tone and accessible, responsive interactions
- Native Pagelove persistence with local-storage fallback for offline previews

## Pagelove architecture

This is intentionally a no-build application: plain HTML, CSS, and JavaScript, following the [Pagelove documentation](https://docs.pagelove.com/).

`index.html` contains the application data and selector-scoped `AuthorizationRule` microdata. The Pagelove client attaches native element methods after capability discovery:

- `PUT()` updates profile, focus, growth, check-in, and individual task elements.
- `POST()` appends new tasks and memory entries.
- `DELETE()` removes task elements.

Writes are limited to authenticated Pagelove users. Pixo also keeps a browser-private `localStorage` copy, so the companion remembers the user even when host authentication is unavailable and during local previews. The Pagelove-hosted HTML remains ready to switch to native selector persistence as soon as an authenticated host session exposes the documented write capabilities.

## Run locally

Serve the folder with any static HTTP server. For example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy to Pagelove

Open the [Pagelove console](https://console.pagelove.com/console/) and upload this folder to a host. No build command or server is required.
