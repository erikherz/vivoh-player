const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    joinMulticast: (addressPort) => {
      ipcRenderer.send('join-multicast', addressPort);
    },
    leaveMulticast: () => {
      ipcRenderer.send('leave-multicast');
    },
    startServer: (port) => {
      ipcRenderer.send('start-server', port);
    },
    stopServer: () => {
      ipcRenderer.send('stop-server');
    },
    clearBuffer: () => {
      ipcRenderer.send('clear-buffer');
    },
    // Add shell.openExternal functionality
    openExternal: (url) => {
      shell.openExternal(url);
    },
    onMulticastJoined: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('multicast-joined');
      ipcRenderer.on('multicast-joined', (_, address) => callback(address));
    },
    onMulticastError: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('multicast-error');
      ipcRenderer.on('multicast-error', (_, error) => callback(error));
    },
    onMulticastData: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('multicast-data');
      ipcRenderer.on('multicast-data', (_, data) => callback(data));
    },
    onServerStarted: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('server-started');
      ipcRenderer.on('server-started', (_, data) => callback(data));
    },
    onBufferCleared: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('buffer-cleared');
      ipcRenderer.on('buffer-cleared', () => callback());
    },
    // Add protocol data handler for command line arguments
    onProtocolData: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('protocol-data');
      ipcRenderer.on('protocol-data', (_, data) => callback(data));
    }
  }
);