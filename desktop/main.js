const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

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

    // Keep window title strictly prefixed with "the stash desktop"
    mainWindow.on('page-title-updated', (event, title) => {
        event.preventDefault();
        if (!title || title.trim() === '' || title === 'the stash') {
            mainWindow.setTitle(APP_NAME);
        } else {
            mainWindow.setTitle(`${APP_NAME} • ${title}`);
        }
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            event.preventDefault();
            shell.openExternal(url);
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
