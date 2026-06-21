#!/usr/bin/env node
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.resolve(__dirname, '../public/core/busytex');

// Engine files + package loader JS. texlive-extra.data (324 MB) is NOT downloaded here —
// Next.js redirects /core/busytex/texlive-extra.data to external object storage so it
// is served directly to the browser without using Vercel bandwidth.
const REQUIRED = [
  'busytex.wasm',
  'busytex.js',
  'busytex_pipeline.js',
  'busytex_worker.js',
  'texlive-extra.js',
  'texmf.cnf',
  'dvipdfmx.cfg',
];

function allExist() {
  return REQUIRED.every(f => fs.existsSync(path.join(DEST, f)));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https.get(u, { headers: { 'User-Agent': 'busytex-downloader/1.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return follow(res.headers.location);
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', d => (buf += d));
        res.on('end', () => resolve(JSON.parse(buf)));
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https.get(u, { headers: { 'User-Agent': 'busytex-downloader/1.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return follow(res.headers.location);
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const file = fs.createWriteStream(dest);
        res.on('data', chunk => {
          received += chunk.length;
          if (total) {
            const pct = ((received / total) * 100).toFixed(1);
            process.stdout.write(
              `\r  ${path.basename(dest)}: ${pct}% (${(received / 1024 / 1024).toFixed(1)}/${(total / 1024 / 1024).toFixed(1)} MB)  `,
            );
          }
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          process.stdout.write('\n');
          resolve();
        });
        file.on('error', err => {
          fs.unlink(dest, () => {});
          reject(err);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

async function main() {
  if (allExist()) {
    console.log('✓ BusyTeX assets already present');
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });

  console.log('Fetching latest texlyre-busytex-build release...');
  const release = await getJson(
    'https://api.github.com/repos/TeXlyre/texlyre-busytex-build/releases/latest',
  );
  console.log(`Release: ${release.tag_name}\n`);

  const byName = Object.fromEntries(
    release.assets.map(a => [a.name, a.browser_download_url]),
  );

  for (const file of REQUIRED) {
    const dest = path.join(DEST, file);
    if (fs.existsSync(dest)) {
      console.log(`  ✓ ${file} (cached)`);
      continue;
    }
    const url = byName[file];
    if (!url) {
      console.error(`  ✗ ${file} not found in release`);
      process.exit(1);
    }
    process.stdout.write(`  Downloading ${file}...\n`);
    await downloadFile(url, dest);
  }

  console.log('\n✓ BusyTeX assets ready');
}

main().catch(err => {
  console.error('\nDownload failed:', err.message);
  process.exit(1);
});
