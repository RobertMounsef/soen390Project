#!/usr/bin/env node
/**
 * Run Jest with JSON output and print pass/fail/skip counts per test file.
 * Usage: node scripts/test-summary.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, '../.jest-results.json');
execSync(`npx jest --json --outputFile=${outFile}`, {
  stdio: 'pipe',
  cwd: path.join(__dirname, '..'),
});

const j = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const byFile = [];

for (const r of j.testResults) {
  const name = path.relative(process.cwd(), r.name);
  let pass = 0, fail = 0, skip = 0;
  for (const a of r.assertionResults) {
    if (a.status === 'passed') pass++;
    else if (a.status === 'failed') fail++;
    else if (a.status === 'skipped') skip++;
  }
  byFile.push({ file: name, pass, fail, skip, total: pass + fail + skip });
}

byFile.sort((a, b) => b.total - a.total);

const w = (s, n) => String(s).padEnd(n);
console.log(w('Test file', 50) + w('Pass', 8) + w('Fail', 8) + w('Skip', 8) + 'Total');
console.log('-'.repeat(76));
for (const { file, pass, fail, skip, total } of byFile) {
  console.log(w(file, 50) + w(pass, 8) + w(fail, 8) + w(skip, 8) + total);
}
console.log('-'.repeat(76));
const sum = byFile.reduce((acc, x) => ({ pass: acc.pass + x.pass, fail: acc.fail + x.fail, skip: acc.skip + x.skip }), { pass: 0, fail: 0, skip: 0 });
console.log(w('Total', 50) + w(sum.pass, 8) + w(sum.fail, 8) + w(sum.skip, 8) + (sum.pass + sum.fail + sum.skip));

try { fs.unlinkSync(outFile); } catch (_) {}
