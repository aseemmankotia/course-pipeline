#!/usr/bin/env node
'use strict';
/**
 * serve.js — Tiny cross-platform static file server (port 8080).
 *
 * Drop-in replacement for `python3 -m http.server 8080`.
 * No external dependencies — only Node's built-in http/fs/path/url modules.
 *
 * Usage: npm start
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.zip':  'application/zip',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json; charset=utf-8',
};

function sendError(res, code, msg) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`${code} ${msg}\n`);
}

function listDirectory(res, dirPath, urlPath) {
  let entries;
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
  catch (e) { return sendError(res, 500, e.message); }

  const items = entries
    .map(e => {
      const name = e.isDirectory() ? `${e.name}/` : e.name;
      const href = encodeURIComponent(e.name) + (e.isDirectory() ? '/' : '');
      return `<li><a href="${href}">${name}</a></li>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Index of ${urlPath}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;}li{list-style:none;}a{text-decoration:none;color:#0366d6;}</style>
</head><body>
<h1>Index of ${urlPath}</h1>
<ul>${urlPath !== '/' ? '<li><a href="../">../</a></li>' : ''}${items}</ul>
</body></html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    pathname = decodeURIComponent(parsed.pathname || '/');
  } catch { return sendError(res, 400, 'Bad Request'); }

  // Strip leading slash, normalize, and reject path-traversal attempts
  const safePath = path.normalize(pathname).replace(/^([/\\])+/, '');
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) return sendError(res, 403, 'Forbidden');

  let stat;
  try { stat = fs.statSync(filePath); }
  catch { return sendError(res, 404, 'Not Found'); }

  if (stat.isDirectory()) {
    const indexFile = path.join(filePath, 'index.html');
    if (fs.existsSync(indexFile)) {
      return streamFile(res, indexFile);
    }
    return listDirectory(res, filePath, pathname.endsWith('/') ? pathname : pathname + '/');
  }

  streamFile(res, filePath);
});

function streamFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const ct  = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => sendError(res, 500, 'Read error'));
  stream.pipe(res);
}

server.listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`→ http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
