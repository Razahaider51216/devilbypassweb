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
const secretPatterns = [
  [/\bAKIA[0-9A-Z]{16}\b/g, "AWS access key"],
  [/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g, "GitHub token"],
  [/\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/g, "Stripe secret key"],
  [/https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g, "Discord webhook"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "private key"],
  [/postgres(?:ql)?:\/\/[^\s:'\"]+:[^\s@'\"]+@/gi, "database credential"],
];

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
    for (const [pattern, description] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) findings.push(`${relative}: contains a possible ${description}`);
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
