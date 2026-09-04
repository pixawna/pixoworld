import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const dryRun = process.argv.includes("--dry-run");

if (existsSync(join(root, ".env"))) {
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const requireValue = (name) => {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and add your PageLove details.`);
  return value;
};

const withSlash = (value) => value.endsWith("/") ? value : `${value}/`;
const webdav = withSlash(requireValue("PAGELOVE_WEBDAV_URL"));
const publicURL = withSlash(requireValue("PAGELOVE_PUBLIC_URL"));
const apiKey = process.env.PAGELOVE_API_KEY?.trim() || (existsSync(join(root, ".apikey")) ? readFileSync(join(root, ".apikey"), "utf8").trim() : "");

if (!dryRun && !apiKey) throw new Error("Missing PAGELOVE_API_KEY. Add it to the git-ignored .env file.");
if (!existsSync(dist)) throw new Error("dist/ is missing. Run npm run build first.");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const walk = (directory, files = []) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
};

const files = walk(dist)
  .map((path) => relative(dist, path).split("\\").join("/"))
  .sort((a, b) => (a === "index.html") - (b === "index.html") || a.localeCompare(b));
const directories = new Set();
for (const file of files) {
  const parts = file.split("/");
  for (let index = 1; index < parts.length; index += 1) directories.add(`${parts.slice(0, index).join("/")}/`);
}

const auth = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

const findETag = async (path) => {
  const response = await fetch(`${webdav}${encodePath(path)}`, { method: "PROPFIND", headers: { ...auth, Depth: "0" } });
  if (response.status === 404) return null;
  if (response.status !== 207) throw new Error(`PROPFIND ${path} returned ${response.status}`);
  return (await response.text()).replace(/\r?\n/g, "").match(/<[^>]*getetag[^>]*>([^<]+)<\/[^>]*getetag>/)?.[1] || null;
};

console.log(`${dryRun ? "Dry run: " : ""}${files.length} files → ${webdav}`);
if (dryRun) {
  files.forEach((file) => console.log(`  PUT ${file}`));
  process.exit(0);
}

for (const directory of [...directories].sort()) {
  const response = await fetch(`${webdav}${encodePath(directory)}`, { method: "MKCOL", headers: auth });
  if (![201, 405, 409].includes(response.status)) throw new Error(`MKCOL ${directory} returned ${response.status}`);
}

let written = 0;
for (const file of files) {
  const etag = await findETag(file);
  const response = await fetch(`${webdav}${encodePath(file)}`, {
    method: "PUT",
    headers: {
      ...auth,
      "Content-Type": contentTypes[extname(file)] || "application/octet-stream",
      ...(etag ? { "If-Match": etag } : { "If-None-Match": "*" }),
    },
    body: readFileSync(join(dist, file)),
  });
  if (![200, 201, 204].includes(response.status)) throw new Error(`PUT ${file} returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  written += 1;
  console.log(`  ${file} (${response.status})`);
}

const publicResponse = await fetch(`${publicURL}?verify=${Date.now()}`);
if (!publicResponse.ok) throw new Error(`Public verification returned ${publicResponse.status}`);
console.log(`Deployed ${written} files. Public page returned ${publicResponse.status}.`);
