const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

console.log('Setting up yt-dlp for Linux...');
execSync('node scripts/setup-ytdlp.js --linux', { stdio: 'inherit', cwd: root });

console.log('Copying src/ to public/...');
if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
copyDir(srcDir, publicDir);

console.log('Vercel build complete.');
