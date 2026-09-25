const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

const APP_NAME = 'the stash desktop';
app.name = APP_NAME;

let mainWindow = null;

function createWindow() {
    const iconPath = process.platform === 'win32'
        ? path.join(__dirname, 'icon.ico')
        : path.join(__dirname, 'icon.png');

    mainWindow = new BrowserWindow({
        title: APP_NAME,
        width: 1366,
        height: 880,
        minWidth: 960,
        minHeight: 640,
        backgroundColor: '#050807',
        icon: iconPath,
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        }
    });

    // Custom menu with navigation & reload shortcuts
    const template = [
        {
            label: 'Navigation',
            submenu: [
                {
                    label: 'The Stash Hub',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
                    }
                },
                {
                    label: 'Back',
                    accelerator: 'Alt+Left',
                    click: () => {
                        if (mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack();
                    }
                },
                {
                    label: 'Forward',
                    accelerator: 'Alt+Right',
                    click: () => {
                        if (mainWindow.webContents.canGoForward()) mainWindow.webContents.goForward();
                    }
                },
                { type: 'separator' },
                { role: 'reload', accelerator: 'CmdOrCtrl+R' },
                { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
                { role: 'toggleDevTools', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'quit', accelerator: 'CmdOrCtrl+Q' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Keep window title strictly formatted with "the stash desktop"
    mainWindow.on('page-title-updated', (event, title) => {
        event.preventDefault();
        if (!title || title.trim() === '' || title === 'the stash') {
            mainWindow.setTitle(APP_NAME);
        } else if (title.startsWith('the stash •')) {
            mainWindow.setTitle(`${APP_NAME} • ${title.replace(/^the stash\s*•\s*/, '')}`);
        } else {
            mainWindow.setTitle(`${APP_NAME} • ${title}`);
        }
    });

    // Handle new-window requests (target="_blank" or window.open)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        if (url.startsWith('file:')) {
            try {
                const parsed = new URL(url);
                const filePath = fileURLToPath(url);
                const target = (url.endsWith('/') || !path.extname(parsed.pathname))
                    ? path.join(filePath, 'index.html')
                    : filePath;
                mainWindow.loadFile(target);
            } catch (e) {
                console.error('[the stash desktop] Window open error:', e);
            }
            return { action: 'deny' };
        }
        return { action: 'deny' };
    });

    // Handle in-window navigation (resolve directory links like ./games/flexle/ to index.html)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            event.preventDefault();
            shell.openExternal(url);
            return;
        }
        if (url.startsWith('file:')) {
            try {
                const parsed = new URL(url);
                if (url.endsWith('/') || !path.extname(parsed.pathname)) {
                    event.preventDefault();
                    const filePath = fileURLToPath(url);
                    const target = filePath.endsWith('index.html') ? filePath : path.join(filePath, 'index.html');
                    mainWindow.loadFile(target);
                }
            } catch (e) {
                console.error('[the stash desktop] will-navigate error:', e);
            }
        }
    });

    // Load local web suite
    const indexPath = path.join(__dirname, 'app', 'index.html');
    mainWindow.loadFile(indexPath);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
