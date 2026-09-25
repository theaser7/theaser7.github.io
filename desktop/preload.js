const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stashDesktop', {
    isDesktop: true,
    version: '0.9.1',
    appName: 'the stash desktop'
});
