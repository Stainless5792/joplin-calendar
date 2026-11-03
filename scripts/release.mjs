#!/usr/bin/env node
// Bumps the plugin version and appends a build timestamp, then packages.
// Version format: <major>.<minor>.<patch>-b<YYYYMMDD>.t<HHmmss>
// The "b"/"t" prefixes keep the identifiers alphanumeric, which is required
// by semver when a numeric part has a leading zero (e.g. 09:05).
//
// Usage:
//   npm run dist                 # patch + 1, then build
//   npm run dist:minor           # minor + 1, then build
//   npm run dist:major           # major + 1, then build
//   npm run release -- --set=2.0.0
//   npm run release -- --dry-run  # show the next version, change nothing

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = path.join(root, "package.json");
const MANIFEST = path.join(root, "src", "manifest.json");
const LOCK = path.join(root, "package-lock.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const pad = (n, width = 2) => String(n).padStart(width, "0");

// Replace version values in place so the original file formatting (inline
// arrays, indentation) is preserved. `limit` keeps dependency versions intact.
function replaceVersion(text, version, limit = 1) {
  let count = 0;
  const replaced = text.replace(
    /("version"\s*:\s*")[^"]*(")/g,
    (match, head, tail) => {
      count += 1;
      return count <= limit ? `${head}${version}${tail}` : match;
    }
  );
  return replaced.replace(/[ \t\r\n]*$/, "") + "\n"; // keep exactly one final newline
}

function parseBase(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) {
    throw new Error(
      `unsupported version "${version}", expected x.y.z or x.y.z-<stamp>`
    );
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpBase(version, args) {
  const setArg = args.find((arg) => arg.startsWith("--set="));
  if (setArg) return parseBase(setArg.slice("--set=".length));

  const level = args.find((arg) => ["major", "minor", "patch"].includes(arg));
  const [major, minor, patch] = parseBase(version);
  if (level === "major" || args.includes("--major")) return [major + 1, 0, 0];
  if (level === "minor" || args.includes("--minor"))
    return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

function buildStamp(now = new Date()) {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;
  return `b${date}.t${time}`;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pkg = readJson(PKG);
const manifest = readJson(MANIFEST);

if (pkg.version !== manifest.version) {
  console.error(
    `version mismatch: package.json=${pkg.version} ` +
      `src/manifest.json=${manifest.version}`
  );
  process.exit(1);
}

const [major, minor, patch] = bumpBase(pkg.version, args);
const next = `${major}.${minor}.${patch}-${buildStamp()}`;

console.log(`version: ${pkg.version} -> ${next}`);
if (dryRun) process.exit(0);

// Snapshot for rollback: a failed build must not leave a bumped version behind.
const snapshot = {
  pkg: fs.readFileSync(PKG, "utf8"),
  manifest: fs.readFileSync(MANIFEST, "utf8"),
  lock: fs.existsSync(LOCK) ? fs.readFileSync(LOCK, "utf8") : null,
};

try {
  // keep package.json / manifest.json / lockfile formatting untouched
  fs.writeFileSync(PKG, replaceVersion(snapshot.pkg, next));
  fs.writeFileSync(MANIFEST, replaceVersion(snapshot.manifest, next));
  if (snapshot.lock !== null) {
    fs.writeFileSync(LOCK, replaceVersion(snapshot.lock, next, 2));
  }

  // webpack reads src/manifest.json when it starts, so the bump must come first
  execFileSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "build:raw"],
    { stdio: "inherit", cwd: root }
  );

  const id = manifest.id;
  const publishDir = path.join(root, "publish");
  const archive = path.join(publishDir, `${id}.jpl`);
  if (fs.existsSync(archive)) {
    fs.copyFileSync(archive, path.join(publishDir, `${id}-v${next}.jpl`));
    console.log(`artifact: publish/${id}-v${next}.jpl`);
  }
} catch (err) {
  fs.writeFileSync(PKG, snapshot.pkg);
  fs.writeFileSync(MANIFEST, snapshot.manifest);
  if (snapshot.lock !== null) fs.writeFileSync(LOCK, snapshot.lock);
  console.error(`build failed; version rolled back to ${pkg.version}`);
  process.exit(1);
}
