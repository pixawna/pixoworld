// Deliberately scripted: no network, provider, or automatic memory writes.
export function smallTalkReply(input, turn = 0) {
  const text = String(input).slice(0, 500).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const reply = (intent, messages, behavior = 'idle') => ({intent, text: messages[turn % messages.length], behavior});
  if (!text) return null;
  if (/\b(not (?:good|great|okay|ok|happy)|sad|lonely|upset|bad day|rough day|stressed|anxious|overwhelmed)\b/.test(text))
    return reply('comfort', ['That sounds like a lot. Want to tell me a little more, or just sit together?', 'You don’t have to make today look perfect. I can keep you company for a moment.']);
  if (/\b(good ?night|sleep|sleepy|bedtime|tired|exhausted)\b/.test(text))
    return reply('rest', ['Let’s slow down a little. Rest is allowed, even when the list isn’t finished.', 'A softer moment sounds good. Unclench your jaw and let your shoulders drop.'], 'reading');
  if (/\b(how (?:is|was|s) your day|hows your day|how are you|how are u|how you doing|how is it going|whats up)\b/.test(text))
    return reply('day', ['A little reading, a little watching the fish. That’s life in my tiny room! How’s your day going?', 'My tiny-room day is looking cozy. How are things in your world?']);
  if (/\b(thirsty|water|drink)\b/.test(text))
    return reply('water', ['A water break together? I’ll grab my little mug. You grab yours.', 'A few sips and a little pause. Cheers, friend!'], 'water');
  if (/\b(hungry|food|eat|lunch|dinner|breakfast|snack)\b/.test(text))
    return reply('food', ['Food break? I’ll keep you company at the table. What sounds good?', 'Let’s make a little room for lunch or a snack. I’ll bring the company.'], 'eating');
  if (/\b(focus|work|study|productive)\b/.test(text))
    return reply('focus', ['What’s one small thing you’d like to work on? Open Focus when you’re ready to start the timer.', 'One thing at a time. Pick a tiny first step; the Focus button is here when you want it.'], 'working');
  if (/\b(joke|funny|laugh)\b/.test(text))
    return reply('joke', ['Why did the pixel bring a blanket? It wanted to feel a bit warmer.', 'My plant asked for a promotion. I said it had plenty of room to grow.']);
  if (/\b(who are you|your name|are you (?:ai|real)|what can you do)\b/.test(text))
    return reply('about', ['I’m Pixo, your little room companion. This mode uses friendly scripted replies, not an AI brain. Try a hello, a check-in, or a water break.']);
  if (/\b(thank you|thanks|thankyou)\b/.test(text))
    return reply('thanks', ['You’re welcome. Little moments count.', 'Anytime, friend. I’m glad we took a little pause.']);
  if (/\b(bye|goodbye|see you)\b/.test(text))
    return reply('bye', ['See you soon. Take a little kindness with you.', 'Bye for now! Your cozy corner will be here.']);
  if (/\b(hi|hey|hel+o+w*|hiya|heya|good morning|good evening)\b/.test(text))
    return reply('hello', ['Hi, friend! It’s nice to have you here. How’s your day going?', 'Hey! Pull up a little chair. How are you feeling today?', 'Hello, you. Want to chat for a moment?']);
  if (/\b(good|great|okay|ok|happy|excited|well)\b/.test(text))
    return reply('good', ['That’s lovely to hear. What’s one little thing that made today good?', 'A little bright spot! Want to put it in our diary?']);
  return reply('fallback', ['I’m still a small-talk companion, so I might miss what you mean. Try “How’s your day?”, “I’m tired”, or “Tell me a joke”.', 'I don’t have an AI brain in this mode. But I can share a hello, a little encouragement, or a cozy break with you.']);
}

// One utterance per microphone click; never listens in the background.
export class SmallTalkSpeech {
  constructor({onInput = () => {}, onStatus = () => {}, onSpeaking = () => {}, platform = globalThis} = {}) {
    Object.assign(this, {onInput, onStatus, onSpeaking, platform});
    this.Recognition = platform.SpeechRecognition || platform.webkitSpeechRecognition;
    this.generation = 0;
  }
  get canListen() { return Boolean(this.Recognition); }
  get canSpeak() { return Boolean(this.platform.speechSynthesis && this.platform.SpeechSynthesisUtterance); }
  stopListening() {
    clearTimeout(this.listenTimeout);
    const recognition = this.recognition;
    this.recognition = null;
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.abort(); } catch { /* Already ended. */ }
    }
  }
  stop() {
    this.generation++;
    this.stopListening();
    clearTimeout(this.speechTimeout);
    if (this.utterance) { this.utterance = null; this.platform.speechSynthesis?.cancel(); }
    this.onSpeaking(false);
    this.onStatus('idle', 'Microphone off. Type or tap the microphone to say hello.');
  }
  listen() {
    this.stop();
    if (!this.canListen) { this.onStatus('error', 'Voice input isn’t available in this browser. You can still type below.'); return; }
    try {
      const recognition = this.recognition = new this.Recognition();
      recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (this.recognition === recognition) this.onStatus('listening', 'Listening… say one message.'); };
      recognition.onresult = event => {
        if (this.recognition !== recognition) return;
        const result = event.results[event.resultIndex || 0];
        if (!result?.isFinal) return;
        const text = result[0]?.transcript?.trim();
        this.stopListening();
        if (text) this.onInput(text.slice(0, 500));
        else this.onStatus('idle', 'I didn’t catch that. Try again or type below.');
      };
      recognition.onerror = event => {
        if (this.recognition !== recognition) return;
        this.stopListening();
        const message = ['not-allowed', 'service-not-allowed'].includes(event.error)
          ? 'Microphone access was denied or unavailable. You can still type below.'
          : event.error === 'network' ? 'The browser’s speech service couldn’t connect. Try typing instead.'
          : 'I couldn’t hear that. Try again or type below.';
        this.onStatus('error', message);
      };
      recognition.onend = () => {
        if (this.recognition !== recognition) return;
        this.stopListening(); this.onStatus('idle', 'Microphone off. Tap again to speak, or type below.');
      };
      this.onStatus('listening', 'Waiting for microphone permission…');
      this.listenTimeout = setTimeout(() => { this.stopListening(); this.onStatus('idle', 'Microphone timed out. Tap again or type below.'); }, 20000);
      recognition.start();
    } catch { this.stopListening(); this.onStatus('error', 'Couldn’t start voice input. You can still type below.'); }
  }
  say(text) {
    this.stop();
    if (!this.canSpeak) { this.onStatus('idle', 'Spoken replies aren’t available here. Pixo’s reply is below.'); return; }
    const generation = this.generation;
    const utterance = this.utterance = new this.platform.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.95; utterance.pitch = 1.08;
    const voices = this.platform.speechSynthesis.getVoices();
    const local = voices.find(voice => voice.localService && /^en\b/i.test(voice.lang));
    if (local) utterance.voice = local;
    const finish = message => {
      if (generation !== this.generation) return;
      clearTimeout(this.speechTimeout); this.utterance = null; this.onSpeaking(false); this.onStatus('idle', message);
    };
    utterance.onstart = () => { if (generation === this.generation) { this.onSpeaking(true); this.onStatus('speaking', 'Pixo is speaking…'); } };
    utterance.onend = () => finish('Your turn. Type or tap the microphone.');
    utterance.onerror = () => finish('Audio couldn’t play. You can read Pixo’s reply below.');
    this.speechTimeout = setTimeout(() => { this.stop(); this.onStatus('idle', 'Audio ended. You can read the reply below.'); }, 30000);
    try { this.platform.speechSynthesis.speak(utterance); } catch { finish('Audio couldn’t play. You can read Pixo’s reply below.'); }
  }
}
