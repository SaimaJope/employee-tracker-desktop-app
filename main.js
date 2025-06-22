// main.js

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Disable hardware acceleration to avoid rendering glitches
app.disableHardwareAcceleration();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 750,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Open DevTools for debugging; remove this line in production
    // mainWindow.webContents.openDevTools();

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to recreate a window when the dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Quit the app on Windows/Linux; stay active on macOS until explicit quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
