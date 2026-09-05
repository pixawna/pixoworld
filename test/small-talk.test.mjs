import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {smallTalkReply, SmallTalkSpeech} from '../small-talk.js';

test('small talk handles greetings, day questions, care and an honest fallback', () => {
  for (const [text, intent] of [['Hi Pixo!', 'hello'], ['helllow', 'hello'], ['Good morning', 'hello'], ['helllow how’s your day', 'day'], ['Hellow', 'hello'], ['How are you?', 'day'], ['I’m tired', 'rest'], ['I am not good', 'comfort'], ['I am happy', 'good'], ['drink water with me', 'water'], ['I am hungry', 'food'], ['Let’s work', 'focus'], ['tell me a joke', 'joke'], ['thanks', 'thanks'], ['bye', 'bye'], ['Who are you?', 'about'], ['solve this equation', 'fallback']]) {
    assert.equal(smallTalkReply(text).intent, intent, text);
  }
  assert.equal(smallTalkReply('   '), null);
  assert.notEqual(smallTalkReply('hi', 0).text, smallTalkReply('hi', 1).text);
  assert.match(smallTalkReply('arbitrary question').text, /small-talk|AI brain/);
  assert.equal(smallTalkReply('water').behavior, 'water');
  assert.equal(smallTalkReply('hungry').behavior, 'eating');
});

function fixture(t) {
  const statuses = [], input = [], speaking = [], synth = {cancelled: 0, speak(utterance) { this.current = utterance; }, cancel() { this.cancelled++; }, getVoices() { return [{lang: 'en-US', localService: true, name: 'Local'}]; }};
  class Recognition {
    constructor() { Recognition.current = this; }
    start() { this.onstart?.(); }
    abort() { this.aborted = true; }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const speech = new SmallTalkSpeech({platform: {SpeechRecognition: Recognition, SpeechSynthesisUtterance: Utterance, speechSynthesis: synth}, onInput: text => input.push(text), onStatus: (state, text) => statuses.push({state, text}), onSpeaking: value => speaking.push(value)});
  t.after(() => speech.stop());
  return {speech, Recognition, synth, input, speaking, statuses};
}

test('microphone is opt-in, accepts one final result and aborts before replying', t => {
  const {speech, Recognition, input} = fixture(t);
  assert.equal(Recognition.current, undefined);
  speech.listen();
  const recognition = Recognition.current;
  assert.equal(recognition.continuous, false);
  const result = [{transcript: 'Hello Pixo'}]; result.isFinal = true;
  const callback = recognition.onresult;
  callback({resultIndex: 0, results: [result]});
  assert.deepEqual(input, ['Hello Pixo']);
  assert.equal(recognition.aborted, true);
  assert.equal(speech.recognition, null);
  callback({resultIndex: 0, results: [result]});
  assert.equal(input.length, 1, 'Late callbacks cannot produce extra replies');
});

test('cancel ignores late microphone results and does not reopen listening', t => {
  const {speech, Recognition, input} = fixture(t);
  speech.listen(); const recognition = Recognition.current, callback = recognition.onresult;
  speech.stop();
  const result = [{transcript: 'hi'}]; result.isFinal = true;
  callback({results: [result]});
  assert.equal(recognition.aborted, true); assert.equal(input.length, 0); assert.equal(speech.recognition, null);
});

test('permission and network errors leave typing available with truthful status', t => {
  const {speech, Recognition, statuses} = fixture(t);
  for (const [error, expected] of [['not-allowed', /denied/], ['network', /couldn’t connect/], ['no-speech', /couldn’t hear/]]) {
    speech.listen(); Recognition.current.onerror({error});
    assert.equal(speech.recognition, null); assert.match(statuses.at(-1).text, expected); assert.equal(statuses.at(-1).state, 'error');
  }
});

test('unsupported speech has a text fallback and requests no microphone', () => {
  let status;
  const speech = new SmallTalkSpeech({platform: {}, onStatus: (_, text) => { status = text; }});
  assert.equal(speech.canListen, false); assert.equal(speech.canSpeak, false);
  speech.listen(); assert.match(status, /still type/);
  speech.say('hello'); assert.match(status, /reply is below/);
});

test('read-aloud prefers local voices, animates only while speaking, and cleans up', t => {
  const {speech, synth, speaking} = fixture(t);
  speech.say('hello');
  const utterance = synth.current;
  assert.equal(utterance.voice.localService, true);
  utterance.onstart(); assert.equal(speaking.at(-1), true);
  speech.stop(); assert.equal(synth.cancelled, 1); assert.equal(speaking.at(-1), false);
  utterance.onstart(); assert.equal(speaking.at(-1), false, 'Cancelled speech cannot resume the animation');
  speech.say('another hello'); synth.current.onend(); assert.equal(speech.utterance, null); assert.equal(speaking.at(-1), false);
});

test('new replies cancel old audio and starting the microphone cancels speech', t => {
  const {speech, synth} = fixture(t);
  speech.say('one'); speech.say('two');
  assert.equal(synth.cancelled, 1);
  assert.equal(synth.current.text, 'two');
  speech.listen(); assert.equal(synth.cancelled, 2); assert.equal(speech.utterance, null);
});

test('default talk ships in static build, stays ephemeral, and preserves optional AI', () => {
  const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(read('room-life.js'), /function renderTalk\(\)\{\s*voice\.stop\(\);\s*smallTalk\.mount\(content\)/);
  assert.match(read('room-life.js'), /function renderAdvancedTalk/);
  assert.match(read('room-life.js'), /function parkPanel\(\)\{smallTalk\.stop\(\)/);
  assert.match(read('scripts/build-site.mjs'), /"small-talk.js", "small-talk-panel.js"/);
  for (const file of ['small-talk.js', 'small-talk-panel.js']) assert.doesNotMatch(read(file), /fetch\(|localStorage|sessionStorage|saveWorld\(/);
  assert.match(read('small-talk-panel.js'), /document\.createTextNode\(message\.text\)/);
});
