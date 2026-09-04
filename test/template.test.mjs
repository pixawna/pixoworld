import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

const loadConfig = (file = "pixo.config.js") => {
  const context = { window: {}, Object };
  vm.runInNewContext(read(file), context);
  return context.window.PIXO_TEMPLATE;
};

test("template configuration is safe and useful", () => {
  const config = loadConfig();
  assert.match(config.id, /^[a-z0-9-]+$/);
  assert.ok(config.companion.name.length > 0);
  assert.ok(config.companion.greetings.length >= 2);
  assert.match(config.appearance.accent, /^#|^rgb|^hsl/);
  assert.ok(Number.isInteger(config.focus.defaultMinutes));
  assert.ok(config.focus.options.includes(config.focus.defaultMinutes));
  assert.ok(config.care.waterGoal >= 4 && config.care.waterGoal <= 16);
  assert.ok(config.care.waterTimes.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)));
  assert.match(config.care.mealTime, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.ok(config.starterTasks.length >= 3 && config.starterTasks.length <= 8);
});

test("included examples satisfy the same contract", () => {
  for (const example of ["study-buddy", "wellbeing"]) {
    const config = loadConfig(`examples/${example}/pixo.config.js`);
    assert.ok(config.companion.name);
    assert.ok(config.focus.options.includes(config.focus.defaultMinutes));
    assert.ok(config.care.waterTimes.length >= 1);
    assert.ok(config.starterTasks.length >= 3);
  }
});

test("PageLove scripts and private mutation contract remain in the page", () => {
  const html = read("index.html");
  const ssePosition = html.indexOf("pagelove/sse.mjs");
  const clientPosition = html.indexOf("pagelove.mjs");
  const configPosition = html.indexOf("pixo.config.js");
  const appPosition = html.indexOf("app.js");

  assert.match(html, /xmlns:p="https:\/\/pagelove\.org\/1\.0"/);
  assert.ok(ssePosition > 0 && clientPosition > ssePosition);
  assert.ok(configPosition > 0 && appPosition > configPosition);
  assert.match(html, /id="app-persistent-state" hidden p:transient/);
  assert.match(html, /id="task-list" p:transient/);
  assert.match(html, /id="memory-log" hidden p:transient/);
  assert.match(html, /itemprop="actor" content="\*"/);
  assert.match(html, /itemprop="resource" content="\/\*"/);
  for (const method of ["GET", "PUT", "POST", "DELETE"]) {
    assert.match(html, new RegExp(`itemprop="method" content="${method}"`));
  }
});

test("hydration value feature is wired to private state", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.match(html, /id="hydration-progress"/);
  assert.match(html, /id="log-water"/);
  assert.match(html, /data-field="water-count"/);
  assert.match(app, /const logWater = async/);
  assert.match(app, /persist\(careState/);
  assert.match(app, /const nextCareMoment/);
});

test("repository does not commit a PageLove credential", () => {
  const source = [read("index.html"), read("app.js"), read("pixo.config.js"), read(".env.example")].join("\n");
  assert.doesNotMatch(source, /PAGELOVE_API_KEY=(?!replace-with)/);
  assert.doesNotMatch(source, /Bearer\s+pk_[A-Za-z0-9_-]+/);
});
