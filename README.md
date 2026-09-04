# Pixo

Pixo is a tiny digital companion who lives with you while you work. He remembers you, cares about your day, helps you focus, and grows alongside you.

## What is included

- A customizable companion profile and focus length
- A focus timer with session, minutes, streak, XP, and level tracking
- A gentle daily task list with add, complete, and delete actions
- A daily mood check-in and a small memory timeline
- Optional ambient room tone and accessible, responsive interactions
- The supplied purple Pixo artwork with floating, breathing, entrance, hover, and celebration motion
- Configurable water and meal reminders with an on-screen Pixo pop-up
- A native macOS menu-bar companion that runs independently of the website
- Native Pagelove session persistence and live mutation updates

## Pagelove architecture

This is intentionally a no-build application: plain HTML, CSS, and JavaScript, following the [Pagelove documentation](https://docs.pagelove.com/).

`index.html` loads Pagelove's documented `sse.mjs` and `pagelove.mjs` client pair. It contains the application data and selector-scoped `AuthorizationRule` microdata. The Pagelove client attaches native element methods after capability discovery:

- `PUT()` updates profile, focus, growth, check-in, and individual task elements.
- `POST()` appends new tasks and memory entries.
- `DELETE()` removes task elements.

Pixo's profile, focus stats, tasks, check-ins, memories, and reminder times use Pagelove's documented `p:transient` elements. Every browser receives a private PageLove-backed session, mutations never alter another visitor's canonical page, and transient content expires after PageLove's current 30-day server TTL. The `/*` permission pattern deliberately covers both the public `/` route and `/index.html`; write rules remain limited to those transient elements. `localStorage` is used only by a local development preview, with a one-time migration for data saved by older deployed versions.

## Run locally

Serve the folder with any static HTTP server. For example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## macOS desktop companion

The desktop companion lives in `desktop/PixoDesktop`. It shows the supplied Pixo character in a floating reminder card at the configured times, includes a menu-bar control, supports snoozing, and can start automatically at login.

Default schedule:

- Water: 10:30 AM, 1:00 PM, and 3:30 PM
- Meal: 5:00 PM

Run `desktop/PixoDesktop/install.sh` to build and install it for the current macOS user. Open **Reminder Settings…** from the Pixo menu-bar icon to change any time.

## Deploy to Pagelove

Open the [Pagelove console](https://console.pagelove.com/console/) and upload this folder to a host. No build command or server is required.
