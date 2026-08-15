#!/usr/bin/env node
// CommonJS version for projects with "type": "module"
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const blocked = [
  'adsterra.com',
  'adsterra.net',
  'effectivecpmnetwork.com',
  'topcreativeformat',
  'highperformanceformat',
  'atOptions',
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    for (const b of blocked) {
      if (lower.includes(b)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const b of blocked) {
    const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(content)) {
      content = content.replace(re, '[removed-ad]');
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched', filePath);
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (stat.isFile()) {
      if (scanFile(p)) replaceInFile(p);
    }
  }
}

const targets = [
  path.join(root, '.output'),
  path.join(root, 'public'),
  path.join(root, 'src'),
];
for (const t of targets) {
  if (fs.existsSync(t)) walk(t);
}
console.log('remove-ads.cjs: done');
