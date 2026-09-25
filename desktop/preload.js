const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stashDesktop', {
    isDesktop: true,
    version: '0.9.0',
    appName: 'the stash desktop'
});
