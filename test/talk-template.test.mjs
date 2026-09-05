import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {smallTalkReply, talkConfig, TALK_INTENTS} from '../small-talk.js';

function definition(path) {
  const sandbox = {window: {}};
  vm.runInNewContext(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), sandbox);
  return sandbox.window.PIXO_TEMPLATE;
}

test('every companion definition has usable key-free chat defaults', () => {
  for (const path of ['pixo.config.js', 'examples/study-buddy/pixo.config.js', 'examples/wellbeing/pixo.config.js']) {
    const template = definition(path), config = talkConfig(template);
    assert.equal(config.name, template.companion.name);
    assert.equal(config.showAdvancedAI, false);
    assert.ok(config.welcome && config.prompts.length >= 3);
    assert.equal(typeof config.readAloud, 'boolean');
    for (const [intent, replies] of Object.entries(template.talk.replies)) {
      assert.ok(TALK_INTENTS.includes(intent));
      assert.ok(replies.length && replies.length <= 8);
      assert.ok(replies.every(text => typeof text === 'string' && text.length <= 500));
    }
  }
});

test('example personalities change replies without changing platform state or geometry', () => {
  const study = definition('examples/study-buddy/pixo.config.js');
  const wellbeing = definition('examples/wellbeing/pixo.config.js');
  assert.match(smallTalkReply('hello', 0, study).text, /study friend/);
  assert.match(smallTalkReply('who are you', 0, study).text, /Mochi/);
  assert.doesNotMatch(smallTalkReply('who are you', 0, study).text, /Pixo/);
  assert.match(smallTalkReply('water', 0, wellbeing).text, /sip, a breath/);
  assert.equal(smallTalkReply('water', 0, wellbeing).behavior, 'water');
  assert.equal(talkConfig(study).readAloud, false);
});

test('reply overrides rotate, expand companion tokens literally and retain fallback intents', () => {
  const template = {companion: {name: '$& Buddy'}, talk: {replies: {hello: ['Hi from {companion}', 'Hello again']}}};
  assert.equal(smallTalkReply('hi', 0, template).text, 'Hi from $& Buddy');
  assert.equal(smallTalkReply('hi', 1, template).text, 'Hello again');
  assert.equal(smallTalkReply('hi', -1, template).text, 'Hi from $& Buddy');
  assert.equal(smallTalkReply('hi', NaN, template).text, 'Hi from $& Buddy');
  assert.equal(smallTalkReply('some unknown request', 0, template).intent, 'fallback');
});

test('older or malformed configuration stays usable and never opts users into AI', () => {
  const template = {companion: {name: 42}, talk: {welcome: {}, prompts: [' ', 8], showAdvancedAI: 'true', replies: {hello: [], day: 'not an array'}}};
  const config = talkConfig(template);
  assert.equal(config.name, 'Pixo');
  assert.equal(config.showAdvancedAI, false);
  assert.equal(config.prompts.length, 4);
  assert.equal(smallTalkReply('hi', 0, template).intent, 'hello');
  assert.equal(talkConfig({talk: {showAdvancedAI: true}}).showAdvancedAI, true);
  assert.equal(talkConfig(null).name, 'Pixo');
});

test('template copy is bounded and public packaging excludes source directories', () => {
  const config = talkConfig({talk: {prompts: Array(30).fill('Hi'), replies: {hello: ['x'.repeat(501), 'Hello']}}});
  assert.equal(config.prompts.length, 8);
  assert.deepEqual(config.replies.hello, ['Hello']);
  const source = readFileSync(new URL('../scripts/package-pagelove.mjs', import.meta.url), 'utf8');
  assert.match(source, /cwd: dist/);
  const build = readFileSync(new URL('../scripts/build-site.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(build.match(/const files = \[(.*)\]/)[1], /server|\.env|\.git/);
});
