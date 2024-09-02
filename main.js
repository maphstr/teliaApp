const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

const storagePath = path.join(app.getPath('userData'), 'loginData.json');
console.log('storing in', storagePath)

function saveLoginData(data) {
    fs.writeFileSync(storagePath, JSON.stringify(data));
}

function loadLoginData() {
    if (fs.existsSync(storagePath)) {
        return JSON.parse(fs.readFileSync(storagePath));
    }
    return null;
}

function createWindow() {
    // Create the browser window.

    const mySession = session.fromPartition('persist:teliaApp', { cache: true });

    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 1024,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Make sure contextIsolation is false to allow the use of executeJavaScript
            partition: mySession,
        },
        icon: path.join(__dirname, 'telia.png'),
    });

    mySession.cookies.get({}).then((cookies) => {
        console.log('Existing cookies:', cookies);
        // Optionally, handle or log cookies before loading the URL
    }).catch((error) => {
        console.error('Failed to retrieve cookies:', error);
    });

    // Load your website
    mainWindow.loadURL('https://sb.telia.no/#/');

    mainWindow.webContents.on('did-finish-load', () => {
        const loginData = loadLoginData();

        if (loginData) {
            const script = `
            setTimeout(() => {
                    console.log('entering login data', "${loginData.username}", "${loginData.password}")
                    const usernameInput = document.getElementById('inputUsername');
                    const passwordInput = document.getElementById('inputPassword');

                    usernameInput.value = "${loginData.username}";
                    passwordInput.value = "${loginData.password}";

                    // Trigger input events
                    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

                    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

                    console.log(usernameInput.value, passwordInput.value);
                }, 1500)
                `;
            mainWindow.webContents.executeJavaScript(script);
        }

        // Inject JS to save login info after a successful login
        const scriptToSaveLogin = `
            setTimeout(()=> {
                console.log('checking')
                document.querySelector('button.btn.btn-lg.btn-primary.btn-block[type="submit"]').addEventListener('click', () => {
                    const loginData = {
                        username: document.getElementById('inputUsername').value,
                        password: document.getElementById('inputPassword').value,
                    };
                    console.log(loginData)
                    require('electron').ipcRenderer.send('save-login-data', loginData);
                });
            }, 500)
        `;
        mainWindow.webContents.executeJavaScript(scriptToSaveLogin);
    });

    const { ipcMain } = require('electron');
    ipcMain.on('save-login-data', (event, loginData) => {
        console.log('saving')
        saveLoginData(loginData);
    });

    // Open the DevTools (optional).
    // mainWindow.webContents.openDevTools();
    mySession.cookies.on('changed', (event, cookie, cause, removed) => {
        if (!removed) {
            console.log('Cookie added or updated:', cookie);
            // Optionally, save the cookie or handle it as needed
        }
    });

}


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});