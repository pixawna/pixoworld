# Pixo template guide

Pixo is designed to be forked. Most companion ideas should need edits in only `pixo.config.js`, plus a replacement image in `assets/`.

## Customize in one file

Open `pixo.config.js` and change:

- `companion`: the name, browser title, hero copy, first message, and click greetings.
- `appearance`: the main accent, soft accent, and glow color. Use valid CSS colors.
- `focus`: the default session length and the choices shown in settings.
- `care`: water reminder times, meal time, and the daily water goal.
- `starterTasks`: up to eight useful defaults for a new visitor.

Times use 24-hour `HH:MM` format. Water goals must be between 4 and 16. Focus lengths must be positive whole minutes.

## Change the character

Replace `assets/pixo_2d.png` with a transparent PNG. A roughly square, full-body character works best. Keep the filename to avoid touching markup; animation is applied by CSS.

If you change the file format or filename, update both image references in `index.html`.

## Try a ready-made variant

```bash
npm run use-example -- study-buddy
npm run use-example -- wellbeing
npm run dev
```

The command copies an example over the root `pixo.config.js`. Commit or back up your current configuration first if you want to keep it.

## PageLove contract

Keep the following pieces when adapting the interface:

- `xmlns:p="https://pagelove.org/1.0"` on the root `<html>` element.
- PageLove’s `sse.mjs` script before `pagelove.mjs`.
- `p:transient` on session-private state containers.
- The selector-scoped `AuthorizationRule` elements.
- Stable IDs for `#app-persistent-state`, `#task-list`, and `#memory-log`.

If you add persisted data, put it inside `#app-persistent-state`, or add a new transient container and extend the selector on the relevant authorization rule. Never place API keys or private credentials in HTML or JavaScript.

## Validate and publish

```bash
npm test
npm run build
cp .env.example .env
npm run deploy:dry
npm run deploy
```

The tests protect the PageLove permission contract and configuration shape. The deployment script builds first, uses conditional WebDAV writes, and uploads `index.html` last so the public page never points at missing assets.
