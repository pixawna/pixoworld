import {smallTalkReply, SmallTalkSpeech} from './small-talk.js?v=smalltalk1';

// This panel keeps only a short, in-memory transcript. It never writes chat to PageLove.
export function createSmallTalkPanel({onReply, onSpeaking, onAdvanced}) {
  let container, messages = [], turn = 0, readAloud = true;
  const speech = new SmallTalkSpeech({onInput: send, onSpeaking, onStatus(state, message) {
    const status = container?.querySelector('#small-talk-status');
    if (status) status.textContent = message;
    const mic = container?.querySelector('#small-talk-mic');
    if (mic) { mic.textContent = state === 'listening' ? 'Stop listening' : 'Tap to speak'; mic.setAttribute('aria-pressed', String(state === 'listening')); }
  }});
  function renderMessages() {
    const log = container?.querySelector('#small-talk-log');
    if (!log) return;
    log.replaceChildren();
    for (const message of messages) {
      const item = document.createElement('p'); item.className = `small-talk-message ${message.who === 'You' ? 'from-you' : ''}`;
      const label = document.createElement('strong'); label.textContent = `${message.who}: `;
      item.append(label, document.createTextNode(message.text)); log.append(item);
    }
    log.scrollTop = log.scrollHeight;
  }
  function send(text) {
    text = String(text).trim().slice(0, 500);
    const reply = smallTalkReply(text, turn);
    if (!reply) return;
    turn++; speech.stop();
    messages.push({who: 'You', text}, {who: 'Pixo', text: reply.text}); messages = messages.slice(-20);
    renderMessages(); onReply(reply);
    if (readAloud) speech.say(reply.text);
  }
  return {
    stop: () => speech.stop(),
    mount(target) {
      container = target;
      container.innerHTML = `<p class="world-note">A little chat, no setup. Friendly scripted replies—not open-ended AI.</p>
        <div id="small-talk-log" class="small-talk-log" role="log" aria-label="Conversation with Pixo" aria-live="polite" aria-relevant="additions"></div>
        <form id="small-talk-form" class="world-form"><label for="small-talk-input">Say something to Pixo</label><input id="small-talk-input" maxlength="500" autocomplete="off" placeholder="Hi Pixo, how’s your day?" required/><button>Send message</button></form>
        <div class="world-chips" id="small-talk-prompts"><button>Hi Pixo</button><button>How’s your day?</button><button>I’m tired</button><button>Tell me a joke</button></div>
        <div class="world-chips"><button id="small-talk-mic" aria-pressed="false">Tap to speak</button><button id="small-talk-stop">Stop audio</button><button id="small-talk-clear">Clear chat</button></div>
        <label class="small-talk-read"><input id="small-talk-read" type="checkbox"/> Read replies aloud</label>
        <p id="small-talk-status" role="status" class="voice-status"></p>
        <p class="voice-privacy">Chat stays in this tab’s memory and clears on reload. Microphone use is optional and stops after one message or when you close this panel. Your browser may send audio to its speech service and need internet. Spoken replies use browser voices; local voices are preferred when available.</p>
        <details class="small-talk-advanced"><summary>Advanced AI voice (optional)</summary><p class="world-note">For open-ended AI conversation only. Requires a separate protected server. Small talk above never needs credentials.</p><button id="small-talk-advanced">Open AI voice settings</button></details>`;
      if (!messages.length) messages.push({who: 'Pixo', text: 'Hi, friend! How’s your day going?'});
      renderMessages();
      const input = container.querySelector('#small-talk-input');
      container.querySelector('#small-talk-form').onsubmit = event => { event.preventDefault(); send(input.value); input.value = ''; input.focus(); };
      container.querySelectorAll('#small-talk-prompts button').forEach(button => { button.onclick = () => send(button.textContent); });
      const read = container.querySelector('#small-talk-read'); read.checked = readAloud;
      read.onchange = () => { readAloud = read.checked; if (!readAloud) speech.stop(); };
      const mic = container.querySelector('#small-talk-mic'); mic.disabled = !speech.canListen;
      mic.onclick = () => speech.recognition ? speech.stop() : speech.listen();
      container.querySelector('#small-talk-stop').onclick = () => speech.stop();
      container.querySelector('#small-talk-clear').onclick = () => { speech.stop(); messages = []; turn = 0; renderMessages(); };
      container.querySelector('#small-talk-advanced').onclick = () => { speech.stop(); onAdvanced(); };
      speech.stop();
      if (!speech.canListen) container.querySelector('#small-talk-status').textContent = 'Voice input isn’t available in this browser. Type a message or choose a greeting.';
    }
  };
}
