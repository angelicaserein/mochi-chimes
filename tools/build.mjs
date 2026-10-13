// 构建脚本：只用 Node 标准库。
// 按文件名顺序拼接 src/js/*.js，外面套 IIFE，输出 dist/main.js；复制 src/index.html 到 dist/。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const jsDir = path.join(srcDir, 'js');
const dist = path.join(root, 'dist');

const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => {
  const t = fs.readFileSync(path.join(jsDir, f), 'utf8');
  return t.endsWith('\n') ? t : t + '\n';
}).join('');

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'main.js'), "(() => {\n'use strict';\n" + body + '})();\n');

let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
html = html.replace(/<script\s+src=["'][^"']*["']\s*>\s*<\/script>/, '<script src="./main.js"></script>');
if (html.indexOf('<script src="./main.js"></script>') < 0) throw new Error('src/index.html 缺少 main.js 的 script 标签');
fs.writeFileSync(path.join(dist, 'index.html'), html);

console.log('built dist/main.js from ' + files.length + ' files: ' + files.join(', '));
