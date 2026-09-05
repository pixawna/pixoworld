# Make your own companion on PageLove

A forkable 3D room with focus, care reminders, private diary and memories, and no-key small talk. Make a study buddy, work companion, or wellbeing room.

## Get a copy

Fork this repository and clone your fork, or try the original:

```bash
git clone https://github.com/pixawna/pixoworld.git my-companion
cd my-companion
npm ci
npm run dev
```

Open `http://localhost:4173`. The supplied commands need Node 20.12+, Python 3, and `zip`/`unzip`. No AI account or API key is required.

## Make it yours

Edit `pixo.config.js`: companion identity, focus, care, starter tasks, and the `talk` welcome, prompts, and replies. `{companion}` in chat copy becomes your companion’s name. All chat copy is plain text.

Or choose **one** example; this replaces your current configuration, so back it up first:

```bash
npm run use-example -- study-buddy
# OR: npm run use-example -- wellbeing
```

No PageLove schema/permission edits are needed for these configuration changes. Geometry and custom animations still live in `room-scene.js`. See [the full customization contract](./TEMPLATE_GUIDE.md).

## Publish to PageLove

Create a host in the [PageLove console](https://console.pagelove.com/console/). Visitors open its **public** address, not the separate `dav-` address.

For manual upload through your authenticated WebDAV connection:

```bash
npm test
npm run package:pagelove
```

Extract `artifacts/pixo-pagelove-template.zip`. Upload **its contents** to your host root, with `index.html` at `/index.html`, not inside a second `dist/` directory. Upload modules/assets first and `index.html` last. Only public app files are packaged—not the optional AI server, repository, or secrets. Preserve the MIT and Three.js license files.

Or use the deployment script:

```bash
cp .env.example .env
# Add your PageLove WebDAV URL, public URL, and deployment key to .env.
npm run deploy:dry
npm run deploy
```

PageLove's deployment key authenticates the owner uploading files. It is **not an AI key**, and visitors do not need it. Never put it in `pixo.config.js` or upload `.env`. Conditional writes protect against silently overwriting concurrent changes.

## Verify your copy

- Open public `/` and `/index.html`; both should display the room.
- Open Talk, check your welcome/prompts, and send “Hi”. There should be no server setup. Test read-aloud and optional microphone input in your browser.
- Add a test task or diary entry; reload and confirm it remains. Check a separate private browser session cannot see it, then delete the test data.
- Check chat messages clear on reload; small talk is not automatically saved as diary or memory.
- Test focus and preview a care reminder. Notifications need permission and web reminders require the page to remain open.

Advanced AI voice, browser website blocking, and the native macOS companion are optional extras with separate setup. None is required for the core PageLove template. See [voice and focus setup](./SETUP_VOICE_AND_FOCUS.md).

## Share your template

Push your source to your own repository. Owners can enable **Template repository** in GitHub settings to offer “Use this template”. Building locally does not change GitHub settings or submit anything to a PageLove gallery. Include a demo and your customization instructions.

This follows the one-definition/examples/deploy approach of the [PageLove calculator template](https://github.com/davekempe/pagelove-calculator-template), but keeps companion sessions private rather than sharing calculator sheets. The app preserves the live client scripts documented in [PageLove’s JavaScript guide](https://docs.pagelove.com/languages/javascript/).
