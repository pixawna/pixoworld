# Pixo voice and focus setup

The home, animations, diary, reminders, completed focus progress, and default small-talk UI run on PageLove. No API key, account, or separate server is needed for small talk. Open-ended AI voice and blocking other websites are optional extras that need a protected server and an installed browser extension respectively.

## Default: no-key small talk

Open **Talk** (or the music-note button), type a message, and press **Send message**. Try “Hi”, “How’s your day?”, “I’m tired”, “I’m hungry”, or “Tell me a joke”. Quick greeting buttons work too. Pixo chooses prewritten replies locally and uses matching room animations. This is intentionally scripted, not general-purpose AI; chat does not execute actions, start timers, log water, or save memories automatically.

**Read replies aloud** uses the browser’s speech synthesizer. Local English voices are preferred when available; if there are none, the default browser voice may be online. Turn read-aloud off for text-only chat. No sound or microphone starts merely by opening Talk.

**Tap to speak** listens to one English message at a time, only after you click and grant browser permission. It stops before Pixo replies. There is no continuous background listening. Closing the panel, switching panels, hiding the page, or pressing Stop audio cancels listening and speech. If recognition is unsupported, denied, offline, or fails, typing remains available. As [MDN documents](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), some browsers send microphone audio to their own recognition service; no API key does not mean fully offline audio. Chat text/replies are kept only in tab memory (last 20 messages), are never automatically sent to PageLove or the AI server, and clear on reload or **Clear chat**.

Customize chat welcome, prompts, replies, and read-aloud defaults in `pixo.config.js` under `talk`. The reply engine is `small-talk.js`; the UI is `small-talk-panel.js`. Both ship in the static build. No new dependency is required.

## Optional advanced AI voice

The reusable template hides AI setup by default. Set `talk.showAdvancedAI: true` in `pixo.config.js` only if you want to offer this optional connection. Small talk remains the default even when that section is enabled.

The client uses the official [OpenAI WebRTC call flow](https://developers.openai.com/api/docs/guides/realtime-webrtc). Pixo listens through the microphone and replies with streamed AI-generated speech. Microphone access starts only from the Start conversation button. Mute, End call, navigation cleanup, connection timeouts, and a ten-minute call limit are implemented. Transcripts are shown temporarily and are not saved by Pixo. Sharing saved memories is separately opt-in for each call.

No provider key or server is configured by the template. Until those are supplied, **advanced AI voice** is not live; default small talk works without them. Do not enter an OpenAI API key into the website or upload it to PageLove.

### Run your private voice server

1. Copy `server/.env.example` to `server/.env` (ignored by Git).
2. Add `OPENAI_API_KEY` from your own OpenAI project and set `PIXO_VOICE_ACCESS_CODE` to a separate random value of at least 16 characters. That code is for accessing your server; it is not the provider API key.
3. Run `npm run voice:server` with Node 20.12+.
4. After enabling `talk.showAdvancedAI`, open Talk → **Advanced AI voice (optional)** → **Open AI voice settings**, use `http://127.0.0.1:8787/session`, and enter the access code. A browser may request local-network access. Prefer a public HTTPS endpoint for use beyond your own computer.

For hosting, run `server/voice-server.mjs` behind HTTPS on a Node-capable service, provide the environment variables using its secret settings, and set `PIXO_VOICE_BIND=0.0.0.0` only in that hosted environment. Set `PIXO_ALLOWED_ORIGINS` to your exact PageLove origin, with no wildcard. The site’s voice form accepts the deployed `/session` URL; it saves only that URL, never the access code.

The server uses `gpt-realtime-2.1-mini` by default, configurable with `PIXO_REALTIME_MODEL`. Actual access and usage charges depend on your OpenAI account. It checks origins, requires a separate access code, limits request size, allows at most six calls per hour per access code, and schedules provider-side hangup after ten minutes. The built-in code is appropriate for a personal companion, not a public anonymous API. For a multi-user template deployment, add per-user authentication and durable distributed rate limits; keep the process alive for call-duration enforcement, or move hangup scheduling to a durable job service.

Pixo has no AI action tools yet: spoken replies cannot silently alter reminders, files, or the focus shield. Audio is sent to OpenAI during an active call; consult your provider’s data controls for retention policies. “Not saved by Pixo” does not mean the provider has no retention policy.

## Focus shield: Brave or Chrome

1. Open `brave://extensions` or `chrome://extensions`.
2. Enable Developer mode and choose **Load unpacked**.
3. Select `extension/focus-shield` from this repository, or extract the website’s downloadable ZIP and select its `focus-shield` folder.
4. Reload Pixo. Open the shield icon and enable **Block social websites during focus**.
5. Start a focus session. The shield status must say it is active before relying on blocking.

The extension redirects Twitter/X, LinkedIn, YouTube (including youtu.be), and Instagram, including subdomains. Existing tabs on those sites are redirected when protection starts; new navigations are blocked by [Chrome’s declarative request rules](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest). Pause/reset/completion releases that tab’s protection. If another Pixo tab is still focusing, its protection remains until it ends. Closing Pixo leaves the current block in place until the session’s scheduled end; restarting the browser clears session rules. There is always a Turn off blocking button in the extension popup and block screen.

The timer’s ephemeral per-tab runtime survives page reload in session storage. Completed minutes and other companion progress continue to use PageLove. If a browser discards the page until after its end time, the expired runtime is reset rather than awarding unverifiable extra time.

This is voluntary focus support, not tamper-proof parental control. Disabling the extension, turning blocking off, using a different browser/profile, or using native apps can bypass it. Incognito is not supported unless the user explicitly enables the extension there. No browsing history is stored or sent to a server. The extension reads the current URLs of permitted social tabs only to redirect already-open feeds; it receives only timer state from Pixo.

For a fork, change the exact PageLove origin in both `manifest.json` and `policy.js`. Never expand the content script to every website.

## Validation

`npm test` covers small-talk intents and speech lifecycle/error cleanup with mocked browser speech APIs, focus-domain matching, multiple-tab/expiry/emergency-off behavior with a mocked browser API, and voice-server authorization/CORS/rate-limit tests with a mocked AI upstream. Real microphone recognition and audible output still need testing in the user's browser; only advanced AI speech needs a configured key. Actual browser enforcement requires installing the extension. These are not claimed verified merely because unit tests pass.
