# Pixo template guide

Pixo is designed to be forked. Focus and care defaults live in `pixo.config.js`; the interactive 3D room is a separate, code-native scene.

## Customize in one file

Open `pixo.config.js` and change:

- `companion`: the name, browser title, hero copy, first message, and click greetings.
- `appearance`: the main accent, soft accent, and glow color. Use valid CSS colors.
- `focus`: the default session length and the choices shown in settings.
- `care`: water reminder times, meal time, and the daily water goal.
- `starterTasks`: up to eight useful defaults for a new visitor.
- `talk`: welcome, quick prompts, read-aloud default, reply overrides, and optional advanced AI settings. Defaults to no-key small talk with advanced settings hidden.

Times use 24-hour `HH:MM` format. Water goals must be between 4 and 16. Focus lengths must be positive whole minutes.

### Chat personality contract

`talk.welcome` and `talk.prompts` are plain text. `{companion}` becomes `companion.name`. `talk.readAloud` is the initial checkbox value, not permission to start audio on page load. `talk.showAdvancedAI` must be explicitly `true` to expose the optional AI setup section; it never automatically connects.

`talk.replies` maps these built-in intents to arrays of alternative replies: `hello`, `day`, `comfort`, `rest`, `water`, `food`, `focus`, `joke`, `about`, `thanks`, `bye`, `good`, `fallback`. Replies rotate across turns. Omitted/empty arrays retain built-in responses and their animation. Strings are limited to 500 characters and arrays to eight entries. Invalid values fall back safely. Matching is English; changing copy alone does not add another language or an AI model. Add new matching logic in `small-talk.js` if needed.

The companion name is used in chat labels, greetings, and built-in replies. It does not rename the voxel model, its hat, or every Pixo-specific room/desktop label; change those separately for a full rebrand. Both examples include chat personalities. These changes require no platform schema edits or credentials.

## Change the character

Edit the voxel character geometry and materials in `room-scene.js` to change the room’s Pixo. Furniture is grouped with interaction names that route to panels in `room-life.js`. Keep those names or update both files together. The renderer uses pinned Three.js modules bundled from `node_modules` into `vendor/` by `npm run dev` or `npm run build`; there is no runtime CDN dependency.

Replace `assets/pixo_2d.png` with a transparent PNG to change the separate reminder-card artwork. This does not replace the 3D model or regenerate native desktop assets.

`room.css` controls the surrounding interface. `room-model.js` defines session defaults, local calendar dates, and keepsake milestones. `room-life.js` manages dialogs, daily diary pages, explicit memories, activity cues, and the persistence bridge. Reduced-motion preferences limit decorative animation, and all essential activities remain available without WebGL through ordinary buttons.

## Room behavior and boundaries

- Daylight follows the device clock, with manual morning, golden-hour, and night previews.
- Pixo moves to the laptop during focus, reads or visits the plant while idle, and gets sleepy at night.
- Memories are explicitly entered and removable. Diary pages contain the visitor’s note and actual logged focus/water totals; they are not AI-generated.
- Talk defaults to scripted small talk with no API keys or server setup: typed messages, browser read-aloud, and optional single-message microphone input. Edit `small-talk.js` for reply intents and `small-talk-panel.js` for the UI. Unknown messages receive an honest fallback, not fabricated AI answers. Chat is tab-only and is not automatically saved as memory; it does not execute commands or change timers. Microphone recognition may require an online browser service; typed replies work locally. An optional advanced WebRTC AI mode remains behind a collapsed settings section; see [setup](./SETUP_VOICE_AND_FOCUS.md).
- The game HUD opens directly, with whole-home, workspace, dining, and bedroom cameras. Change the `views` map and activity destinations in `room-scene.js` together when moving furniture.
- The optional browser shield blocks social sites only after installation and opt-in. Forks must update the exact allowed PageLove origin in the extension manifest and policy.
- Browser reminders require an open page. Notifications need explicit permission; they do not turn the website into a background desktop process.
- PageLove state is private to the browser session, not an account-based cross-device archive.

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

Room state is serialized in `#world-state` inside `#app-persistent-state`. The application bridge writes it using the existing root’s `PUT()` capability; no new public-write rule is required. Keep the root mounted when opening room dialogs. Local development snapshots include the same room state.

If you add persisted data, put it inside `#app-persistent-state`, or add a new transient container and extend the selector on the relevant authorization rule. Never place API keys or private credentials in HTML or JavaScript.

## Validate and publish

```bash
npm ci
npm test
npm run build
cp .env.example .env
npm run deploy:dry
npm run deploy
```

The tests protect the PageLove permission contract and configuration shape. The deployment script builds first, uses conditional WebDAV writes, and uploads `index.html` last so the public page never points at missing assets.
