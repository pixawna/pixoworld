import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const files = ["index.html", "styles.css", "app.js", "pixo.config.js", "LICENSE"];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of files) {
  const source = join(root, file);
  if (!existsSync(source)) throw new Error(`Missing required template file: ${file}`);
  cpSync(source, join(output, file));
}

mkdirSync(join(output, "assets"), { recursive: true });
cpSync(join(root, "assets", "pixo_2d.png"), join(output, "assets", "pixo_2d.png"));

const built = readdirSync(output, { recursive: true }).filter((entry) => !entry.endsWith(".DS_Store"));
console.log(`Built ${built.length} files in dist/`);
