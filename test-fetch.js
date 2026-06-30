const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    win.webContents.on('did-finish-load', async () => {
      try {
        const html = await win.webContents.executeJavaScript('document.body.innerHTML');
        console.log("HTML Start:", html.substring(0, 500));
        
        const loaderData = await win.webContents.executeJavaScript('window.SSR.loaderData');
        const fs = require('fs');
        fs.writeFileSync('D:/Projects/AiSteamAdvisor/loaderData.json', JSON.stringify(loaderData, null, 2));
        console.log("Wrote loaderData.json!");
      } catch (e) {
        console.log("Error executing JS:", e);
      }
      app.quit();
    });

    await win.loadURL('https://store.steampowered.com/wishlist/profiles/76561197960287930/');
  } catch (e) {
    console.error(e);
    app.quit();
  }
});
