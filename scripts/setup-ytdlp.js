const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const https = require('https');

const root = path.join(__dirname, '..');
const binDir = path.join(root, 'bin');
const forceLinux = process.argv.includes('--linux');
const platform = forceLinux ? 'linux' : process.platform;
const isWin = platform === 'win32';
const target = path.join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');
const url = isWin
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

function download(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl) => {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed (${res.statusCode})`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          fs.writeFileSync(dest, Buffer.concat(chunks));
          resolve();
        });
      }).on('error', reject);
    };
    follow(fileUrl);
  });
}

async function main() {
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

  console.log(`Downloading yt-dlp for ${platform}...`);
  await download(url, target);
  if (!isWin) fs.chmodSync(target, 0o755);

  const version = execFileSync(target, ['--version'], { encoding: 'utf8' }).trim().split('\n')[0];
  console.log(`\nInstalled: ${target}`);
  console.log(`Version:   ${version}`);
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
