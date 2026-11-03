#!/usr/bin/env node
// Runs the three webpack build steps without touching the plugin version.
// Used by `prepare` (npm install), `watch` and scripts/release.mjs.

import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.assign({}, process.env);

// webpack 4 uses MD4, which OpenSSL 3 (Node >= 17) rejects
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 17) {
  env.NODE_OPTIONS = `${
    env.NODE_OPTIONS || ""
  } --openssl-legacy-provider`.trim();
}

const webpackCli = require.resolve("webpack-cli/bin/cli.js");
for (const config of ["buildMain", "buildExtraScripts", "createArchive"]) {
  execFileSync(
    process.execPath,
    [webpackCli, "--joplin-plugin-config", config],
    { cwd: root, env, stdio: "inherit" }
  );
}
