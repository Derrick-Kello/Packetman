// main.js - Electron Main Process
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const fs = require("fs");

let splashWindow;
let mainWindow;

function createWindow() {
  // Determine which icon file exists
  let iconPath = null;
  const possibleIcons = [
    path.join(__dirname, "icon.png"),
    path.join(__dirname, "icon.ico"),
    path.join(__dirname, "icon.icns"),
    path.join(__dirname, "build", "icon.png"),
  ];

  for (const icon of possibleIcons) {
    if (fs.existsSync(icon)) {
      iconPath = icon;
      break;
    }
  }

  // 1️⃣ Create the Splash Screen (lightweight)
  splashWindow = new BrowserWindow({
    width: 600,
    height: 500,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: "#1e3c72",
    show: false, // Don't show immediately
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  
  // Show splash once it's ready to prevent white flash
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  // 2️⃣ Create the Main App Window (hidden initially)
  const windowOptions = {
    width: 1400,
    height: 900,
    title: "PacketMan",
    show: false, // Keep hidden until fully loaded
    backgroundColor: '#1e1e1e', // Match app background to prevent white flash
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };

  if (iconPath) windowOptions.icon = iconPath;

  mainWindow = new BrowserWindow(windowOptions);
  
  // Prevent white flash by not loading until splash is shown
  splashWindow.webContents.once('did-finish-load', () => {
    // Start loading main window after splash is visible
    mainWindow.loadFile("index.html");
  });
  
  // Wait for main window to be fully ready
  mainWindow.webContents.once('did-finish-load', () => {
    // Keep splash visible for minimum 2.5 seconds to show animations
    const splashStartTime = Date.now();
    const minSplashTime = 2500;
    
    setTimeout(() => {
      const elapsed = Date.now() - splashStartTime;
      const remainingTime = Math.max(0, minSplashTime - elapsed);
      
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
        mainWindow.show();
        mainWindow.focus();
      }, remainingTime);
    }, 100);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle all HTTP request types
ipcMain.handle("make-request", async (event, config) => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const urlObj = new URL(config.url);
      const isHttps = urlObj.protocol === "https:";
      const client = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: config.method.toUpperCase(),
        headers: config.headers || {},
        timeout: 30000,
        rejectUnauthorized: false, // Allow self-signed certificates
      };

      const req = client.request(options, (res) => {
        let chunks = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const data = Buffer.concat(chunks);
          const duration = Date.now() - startTime;
          let bodyText = "";
          try {
            bodyText = data.toString("utf8");
          } catch (e) {
            bodyText = data.toString("binary");
          }

          resolve({
            success: true,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: bodyText,
            duration: duration,
            size: data.length,
          });
        });
      });

      req.on("error", (error) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          status: 0,
          statusText: "Network Error",
          headers: {},
          data: `Error: ${error.message}`,
          duration: duration,
          error: true,
          errorMessage: error.message,
        });
      });

      req.on("timeout", () => {
        req.destroy();
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          status: 0,
          statusText: "Timeout",
          headers: {},
          data: "Request timed out after 30 seconds",
          duration: duration,
          error: true,
          errorMessage: "Request timeout",
        });
      });

      // Handle request body
      if (
        config.body &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(config.method.toUpperCase())
      ) {
        if (typeof config.body === "string") {
          req.write(config.body);
        } else {
          req.write(JSON.stringify(config.body));
        }
      }

      req.end();
    } catch (error) {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        status: 0,
        statusText: "Error",
        headers: {},
        data: `Error: ${error.message}`,
        duration: duration,
        error: true,
        errorMessage: error.message,
      });
    }
  });
});
