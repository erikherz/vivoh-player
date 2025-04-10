const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const dgram = require('dgram');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Global reference to prevent garbage collection
let mainWindow;
let multicastSocket = null;
let webSocketServer = null;
let httpServer = null;
let expressApp = null;
let multicastArgument = null;

// Buffer to store multicast data
const dataBuffer = {
  packets: [],
  maxSize: 100, // Maximum number of packets to store
  addPacket(data) {
    // Add packet to the buffer
    this.packets.push(data);
    
    // Keep buffer size limited
    if (this.packets.length > this.maxSize) {
      this.packets = this.packets.slice(-this.maxSize);
    }
  },
  clear() {
    this.packets = [];
  },
  getPackets() {
    return [...this.packets];
  }
};

const template = [
  // Other menu items like File, Edit, etc.
  {
    label: 'Help',
    submenu: [
      {
        label: 'Multicast Video Player', 
        click: async () => {
            await shell.openExternal('https://vivoh.com')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'About',
        role: 'about'
      }
    ]
  }
];

// If you need to update the menu later:
function updateHelpMenuText(newText) {
  // Get the current menu
  const currentMenu = Menu.getApplicationMenu();
  
  // Find the Help menu
  const helpMenu = currentMenu.items.find(item => item.label === 'Help');
  
  if (helpMenu && helpMenu.submenu) {
    // Update the first item in the Help submenu
    helpMenu.submenu.items[0].label = newText;
    
    // Important: You must rebuild and set the application menu again
    // for changes to take effect
    Menu.setApplicationMenu(currentMenu);
  }
}

// Parse command line arguments
function processArguments() {
  // For packaged app (yourapp.exe $1)
  if (process.defaultApp) {
    // When running with electron directly, args start at index 2
    if (process.argv.length >= 3) {
      multicastArgument = process.argv[2];
    }
  } else {
    // When running as packaged app, args start at index 1
    if (process.argv.length >= 2) {
      multicastArgument = process.argv[1];
    }
  }
  
  console.log('Raw command line argument:', multicastArgument);
  
  if (multicastArgument) {
    // Extract the multicast address from the argument
    // Format: "globalUrl=fec://239.0.0.1:8888"
    let extractedAddress = multicastArgument;
    
    // Check if it contains the globalUrl prefix
    if (multicastArgument.includes('globalUrl=')) {
      const match = multicastArgument.match(/globalUrl=(?:fec:\/\/)?([^\/\s]+)/);
      if (match && match[1]) {
        extractedAddress = match[1];
      }
    }
    
    console.log('Extracted multicast address:', extractedAddress);
    multicastArgument = extractedAddress;
  }
}

// Create WebSocket server
function createServer(port = 8080) {
  // Close existing server if any
  closeServer();
  
  // Create Express app
  expressApp = express();
  
  // Create HTTP server
  httpServer = http.createServer(expressApp);
  
  // Create WebSocket server
  webSocketServer = new WebSocket.Server({ 
    server: httpServer,
    path: '/mpegts'  // Specific path for mpegts.js compatibility
  });
  
  // Set up WebSocket connection handling
  webSocketServer.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Set up basic routes
  expressApp.get('/', (req, res) => {
    res.send('WebSocket Server for Multicast Data');
  });
  
  expressApp.get('/status', (req, res) => {
    res.json({
      status: 'running',
      clients: webSocketServer ? webSocketServer.clients.size : 0,
      bufferedPackets: dataBuffer.packets.length
    });
  });
  
  // Start server
  httpServer.listen(port, () => {
    console.log(`HTTP/WebSocket server running on port ${port}`);
    if (mainWindow) {
      mainWindow.webContents.send('server-started', { port });
    }
  });
}

function closeServer() {
  if (httpServer) {
    httpServer.close(() => {
      console.log('HTTP/WebSocket server closed');
    });
    httpServer = null;
  }
  if (webSocketServer) {
    webSocketServer.close();
    webSocketServer = null;
  }
  expressApp = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1290,
    height: 880,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // Send the multicast argument to the renderer when window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (multicastArgument) {
      console.log(`Sending multicast argument to renderer: ${multicastArgument}`);
      mainWindow.webContents.send('protocol-data', multicastArgument);
      
      // Auto-join the multicast group
      joinMulticastGroup(multicastArgument);
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Let the OS handle the URL with the default browser
    shell.openExternal(url);
    return { action: 'deny' }; // Prevent Electron from opening it
  });
  
  // Prevent garbage collection
  mainWindow.on('closed', () => {
    mainWindow = null;
    closeMulticastSocket();
    closeServer();
  });
}

function closeMulticastSocket() {
  if (multicastSocket) {
    try {
      multicastSocket.close();
      console.log('Multicast socket closed');
    } catch (err) {
      console.error('Error closing multicast socket:', err);
    }
    multicastSocket = null;
  }
}

function joinMulticastGroup(addressPort) {
  // Close any existing socket
  closeMulticastSocket();
  
  // Parse the address and port
  const [address, portStr] = addressPort.split(':');
  const port = parseInt(portStr, 10);
  
  if (!address || isNaN(port)) {
    console.error('Invalid multicast address:port format');
    mainWindow.webContents.send('multicast-error', 'Invalid multicast address:port format');
    return;
  }
  
  // Start the WebSocket server if not already running
  createServer();
  
  // Create a new UDP socket
  multicastSocket = dgram.createSocket('udp4');
  
  multicastSocket.on('error', (err) => {
    console.error(`Multicast socket error:\n${err.stack}`);
    mainWindow.webContents.send('multicast-error', err.message);
    multicastSocket.close();
  });
  
  multicastSocket.on('listening', () => {
    const socketAddress = multicastSocket.address();
    console.log(`Multicast socket listening on ${socketAddress.address}:${socketAddress.port}`);
    
    try {
      // Join the multicast group
      multicastSocket.addMembership(address);
      console.log(`Joined multicast group: ${address}`);
      mainWindow.webContents.send('multicast-joined', address);
    } catch (err) {
      console.error('Error joining multicast group:', err);
      mainWindow.webContents.send('multicast-error', `Failed to join multicast group: ${err.message}`);
    }
  });
  
  multicastSocket.on('message', (msg, rinfo) => {
    console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
    
    // Forward raw MPEG-TS data directly to WebSocket clients
    if (webSocketServer && webSocketServer.clients) {
      webSocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          // Send the raw binary data directly - mpegts.js expects this format
          client.send(msg);
        }
      });
    }
    
    // Add to buffer (if needed for diagnostic purposes)
    dataBuffer.addPacket({
      timestamp: Date.now(),
      size: msg.length,
      rinfo: {
        address: rinfo.address,
        port: rinfo.port
      }
    });
    
    // Forward notification to the renderer process
    mainWindow.webContents.send('multicast-data', {
      size: msg.length,
      rinfo: rinfo
    });
  });
  
  // Bind to the specified port
  // Using 0.0.0.0 to listen on all interfaces
  multicastSocket.bind(port, '0.0.0.0', () => {
    multicastSocket.setBroadcast(true);
    multicastSocket.setMulticastTTL(128);
  });
}

// Handle IPC messages from renderer
function setupIPC() {
  ipcMain.on('join-multicast', (event, addressPort) => {
    console.log(`Request to join multicast group: ${addressPort}`);
    joinMulticastGroup(addressPort);
  });
  
  ipcMain.on('leave-multicast', () => {
    console.log('Request to leave multicast group');
    closeMulticastSocket();
  });
  
  ipcMain.on('start-server', (event, port) => {
    console.log(`Request to start WebSocket server on port: ${port || 8080}`);
    createServer(port || 8080);
  });
  
  ipcMain.on('stop-server', () => {
    console.log('Request to stop WebSocket server');
    closeServer();
  });
  
  ipcMain.on('clear-buffer', () => {
    console.log('Request to clear buffer');
    dataBuffer.clear();
    if (mainWindow) {
      mainWindow.webContents.send('buffer-cleared');
    }
  });

  ipcMain.on('update-help-menu', (event, newText) => {
    console.log(`Request to update Help menu text to: ${newText}`);
    updateHelpMenuText(newText);
  });
}

// Process the command line arguments before app is ready
processArguments();

// Single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Quit if another instance is already running
  app.quit();
} else {
  // Handle second instance launch with arguments
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance with arguments
    let secondInstanceArg = null;
    
    if (process.defaultApp) {
      if (commandLine.length >= 3) {
        secondInstanceArg = commandLine[2];
      }
    } else {
      if (commandLine.length >= 2) {
        secondInstanceArg = commandLine[1];
      }
    }
    
    if (secondInstanceArg) {
      console.log('Second instance launched with arg:', secondInstanceArg);
      
      // Extract the multicast address if needed
      if (secondInstanceArg.includes('globalUrl=')) {
        const match = secondInstanceArg.match(/globalUrl=(?:fec:\/\/)?([^\/\s]+)/);
        if (match && match[1]) {
          secondInstanceArg = match[1];
        }
      }
      
      // Send to existing window
      if (mainWindow) {
        mainWindow.webContents.send('protocol-data', secondInstanceArg);
        // Auto-join the new multicast group
        joinMulticastGroup(secondInstanceArg);
      }
    }
    
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    setupIPC();
    createAppMenu();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  closeMulticastSocket();
  closeServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createAppMenu() {
  // Define the menu template
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://vivoh.com')
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://vivoh.com/support')
          }
        }
      ]
    }
  ];

  // Build the menu from template
  const menu = Menu.buildFromTemplate(template);
  
  // Set as main app menu
  Menu.setApplicationMenu(menu);
  
  return menu;
}

// Function to update the Help menu text
function updateHelpMenuText(newText) {
  // Get the current menu
  const currentMenu = Menu.getApplicationMenu();
  
  // Find the Help menu
  const helpMenu = currentMenu.items.find(item => item.label === 'Help');
  
  if (helpMenu && helpMenu.submenu) {
    // Update the first item in the Help submenu
    helpMenu.submenu.items[0].label = newText;
    
    // Important: You must rebuild and set the application menu again
    // for changes to take effect
    Menu.setApplicationMenu(currentMenu);
  }
}