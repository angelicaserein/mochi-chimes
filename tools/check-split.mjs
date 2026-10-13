// 校验：拆分前的 main.js（git show <ref>:main.js）去掉最外层 IIFE 后，与 dist/main.js 去掉包装后逐行比较。
// 用法：node tools/check-split.mjs [ref=HEAD]   （阶段一提交后请传入拆分前的提交）
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv[2] || 'HEAD';
const strip = text => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (lines[0] !== '(() => {' || lines[1] !== "'use strict';" || lines[lines.length - 1] !== '})();') throw new Error('IIFE 包装不符合预期');
  return lines.slice(2, -1).filter(l => l.trim() !== '');   // 仅允许空行差异
};
const a = strip(execSync('git show ' + ref + ':main.js', { cwd: root, maxBuffer: 1 << 26 }).toString('utf8'));
const b = strip(fs.readFileSync(path.join(root, 'dist', 'main.js'), 'utf8'));
let diff = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) { console.log('第 ' + (i + 1) + ' 行不同:\n  原: ' + a[i] + '\n  新: ' + b[i]); if (++diff >= 10) break; }
}
if (diff) { console.log('FAIL'); process.exit(1); }
console.log('PASS: ' + a.length + ' 行非空代码完全一致');
