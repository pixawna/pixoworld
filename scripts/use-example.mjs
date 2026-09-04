import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
const examplesDir = join(root, "examples");
const choices = readdirSync(examplesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);

if (!name || !choices.includes(name)) {
  console.error(`Choose an example: npm run use-example -- ${choices.join(" | ")}`);
  process.exit(1);
}

const source = join(examplesDir, name, "pixo.config.js");
if (!existsSync(source)) throw new Error(`Example ${name} has no pixo.config.js`);
copyFileSync(source, join(root, "pixo.config.js"));
console.log(`Applied the ${name} companion. Run npm run dev to preview it.`);
