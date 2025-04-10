const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Multicast functions
    joinMulticast: (addressPort) => {
      ipcRenderer.send('join-multicast', addressPort);
    },
    leaveMulticast: () => {
      ipcRenderer.send('leave-multicast');
    },
    
    // Server functions
    startServer: (port) => {
      ipcRenderer.send('start-server', port);
    },
    stopServer: () => {
      ipcRenderer.send('stop-server');
    },
    
    // Buffer management
    clearBuffer: () => {
      ipcRenderer.send('clear-buffer');
    },
    
    // External link handling
    openExternal: (url) => {
      return shell.openExternal(url);
    },
    
    // Event listeners for multicast
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
    
    // Server event listeners
    onServerStarted: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('server-started');
      ipcRenderer.on('server-started', (_, data) => callback(data));
    },
    
    // Buffer event listeners
    onBufferCleared: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('buffer-cleared');
      ipcRenderer.on('buffer-cleared', () => callback());
    },
    
    // Protocol data handler for command line arguments
    onProtocolData: (callback) => {
      // Remove any existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners('protocol-data');
      ipcRenderer.on('protocol-data', (_, data) => callback(data));
    },
    
    // Menu controls
    updateHelpMenu: (newText) => {
      ipcRenderer.send('update-help-menu', newText);
    },
    
    // Log related functions - New additions
    
    // Send a log message to the main process
    sendLogMessage: (message, type = 'info') => {
      ipcRenderer.send('log-message', { 
        message, 
        type, 
        timestamp: new Date().toISOString() 
      });
    },
    
    // Request to open the log window
    openLogWindow: () => {
      ipcRenderer.send('open-log-window');
    },
    
    // Event fired when log window is opened
    onLogWindowOpened: (callback) => {
      ipcRenderer.removeAllListeners('log-window-opened');
      ipcRenderer.on('log-window-opened', () => callback());
    },
    
    // For the log window - receive new log messages
    onNewLogMessage: (callback) => {
      ipcRenderer.removeAllListeners('new-log-message');
      ipcRenderer.on('new-log-message', (_, data) => callback(data));
    },
    
    // For the log window - get existing logs from buffer
    getExistingLogs: (callback) => {
      ipcRenderer.invoke('get-existing-logs')
        .then((logs) => callback(logs))
        .catch((error) => {
          console.error('Failed to get existing logs:', error);
          callback([]);
        });
    },
    
    // Clear all logs from the buffer
    clearLogs: () => {
      ipcRenderer.send('clear-logs');
    }
  }
);