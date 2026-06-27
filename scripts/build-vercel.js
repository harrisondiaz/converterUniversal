const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');
const binDir = path.join(root, 'bin');
const libBinDir = path.join(root, 'lib', 'bin');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function copyBinary(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

console.log('Setting up yt-dlp for Linux...');
execSync('node scripts/setup-ytdlp.js --linux', { stdio: 'inherit', cwd: root });

const ytdlpBin = path.join(binDir, 'yt-dlp');
if (!fs.existsSync(ytdlpBin)) {
  console.error('ERROR: bin/yt-dlp was not created');
  process.exit(1);
}

console.log('Copying yt-dlp into lib/bin for serverless bundle...');
copyBinary(ytdlpBin, path.join(libBinDir, 'yt-dlp'));

console.log('Verifying yt-dlp binary...');
const version = execFileSync(ytdlpBin, ['--version'], { encoding: 'utf8' }).trim().split('\n')[0];
console.log(`yt-dlp ${version} OK (${fs.statSync(ytdlpBin).size} bytes)`);

console.log('Copying src/ to public/...');
if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
copyDir(srcDir, publicDir);

console.log('Vercel build complete.');
