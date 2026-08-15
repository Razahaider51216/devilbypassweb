#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const candidates = [
  path.resolve(__dirname, "..", "dist", "client"),
  path.resolve(__dirname, "..", ".output", "public"),
];
const publicDir = candidates.find((directory) => fs.existsSync(directory));
const forbiddenLiterals = [
  "api.ixcore.xyz",
  "IXCORE_API_KEY",
  "SESSION_SECRET",
  "ADMIN_PASSWORD",
  "RESEND_API_KEY",
  "SLIPOK_API_KEY",
  "DISCORD_CLIENT_SECRET",
  "reserve_bypass_slot",
  "finish_bypass_slot",
];
const serverSecretNames = [
  "IXCORE_API_KEY",
  "SESSION_SECRET",
  "ADMIN_PASSWORD",
  "RESEND_API_KEY",
  "SLIPOK_API_KEY",
  "DISCORD_CLIENT_SECRET",
];
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }

    const relative = path.relative(publicDir, absolute).replaceAll(path.sep, "/");
    if (entry.name.endsWith(".map")) findings.push(`${relative}: source map is public`);
    if (/^(?:\.env|\.git)|(?:^|\/)\.env/i.test(relative)) {
      findings.push(`${relative}: sensitive dotfile is public`);
    }

    if (!/\.(?:js|mjs|cjs|html|json|txt|css)$/i.test(entry.name)) continue;
    const content = fs.readFileSync(absolute, "utf8");
    for (const literal of forbiddenLiterals) {
      if (content.includes(literal)) findings.push(`${relative}: contains ${literal}`);
    }
    for (const name of serverSecretNames) {
      const value = process.env[name];
      if (value && value.length >= 8 && content.includes(value)) {
        findings.push(`${relative}: contains the value of ${name}`);
      }
    }
  }
}

if (!publicDir) {
  console.error("Security check failed: production public output does not exist.");
  process.exit(1);
}

walk(publicDir);
if (findings.length > 0) {
  console.error("Security check failed; browser artifacts contain server-only material:");
  for (const finding of [...new Set(findings)]) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Security check passed: no source maps or server-only secrets in browser artifacts.");
