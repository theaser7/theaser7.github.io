const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(__dirname, 'app');

console.log('[the stash desktop] Syncing web assets to app bundle...');

if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true, force: true });
}
fs.mkdirSync(appDir, { recursive: true });

// Copy index.html
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(appDir, 'index.html'));

// Copy games directory
const gamesSrc = path.join(rootDir, 'games');
if (fs.existsSync(gamesSrc)) {
    fs.cpSync(gamesSrc, path.join(appDir, 'games'), { recursive: true });
}

// Copy utilities directory
const utilsSrc = path.join(rootDir, 'utilities');
if (fs.existsSync(utilsSrc)) {
    fs.cpSync(utilsSrc, path.join(appDir, 'utilities'), { recursive: true });
}

console.log('[the stash desktop] Assets synced successfully to', appDir);
