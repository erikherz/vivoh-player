const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1290,
    height: 810,
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

