// Bump the plugin version and optionally rebuild the .jpl archive.
//
// Usage:
//   npm run bump-version                 # bump patch only
//   npm run bump-version -- minor        # bump minor only
//   npm run release                      # bump patch, then build
//   npm run release -- minor             # bump minor, then build
//   npm run release -- --dry-run         # show the next version, change nothing
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const level =
  args.find((arg) => ["patch", "minor", "major"].includes(arg)) ?? "patch";
const build = args.includes("--build");
const dryRun = args.includes("--dry-run");

const packageUrl = new URL("../package.json", import.meta.url);
const manifestUrl = new URL("../src/manifest.json", import.meta.url);
const lockUrl = new URL("../package-lock.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await fs.readFile(url, "utf8"));
}

async function writeJson(url, value) {
  await fs.writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
}

const pkg = await readJson(packageUrl);
const current = pkg.version;
const parts = current.split(".").map(Number);

if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
  throw new Error(`Invalid version in package.json: "${current}"`);
}

const [major, minor, patch] = parts;
const next =
  level === "major"
    ? `${major + 1}.0.0`
    : level === "minor"
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

console.log(
  `Version ${current} -> ${next} (${level})${dryRun ? " [dry run]" : ""}`
);

if (!dryRun) {
  pkg.version = next;
  await writeJson(packageUrl, pkg);

  const manifest = await readJson(manifestUrl);
  manifest.version = next;
  await writeJson(manifestUrl, manifest);

  try {
    const lock = await readJson(lockUrl);
    lock.version = next;
    if (lock.packages?.[""]) {
      lock.packages[""].version = next;
    }
    await writeJson(lockUrl, lock);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (build) {
    execSync("npm run dist", { stdio: "inherit" });
  }
}
