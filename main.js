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
        icon: path.join(__dirname, 'icon.png'),
    });

    mySession.cookies.get({}).then((cookies) => {
        console.log('Existing cookies:', cookies);
        // Optionally, handle or log cookies before loading the URL
    }).catch((error) => {
        console.error('Failed to retrieve cookies:', error);
    });

    // Load your website
    mainWindow.loadURL('https://sb.telia.no/login/#/');

    mainWindow.webContents.on('did-finish-load', () => {
        const loginData = loadLoginData();
        let loginScript = ""

        if (loginData) {
            loginScript = `
            let interval2 = setInterval(()=> {
                console.log('searching for inputs')
                const usernameInput = document.getElementById('inputUsername');
                const passwordInput = document.getElementById('inputPassword');
                
                if(usernameInput && passwordInput) {
                    console.log('entering login data', "${loginData.username}", "${loginData.password}")
                    usernameInput.value = "${loginData.username}";
                    passwordInput.value = "${loginData.password}";
                    
                    // Trigger input events
                    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log('entered login information');
                    clearInterval(interval2)
                    setTimeout(()=> {
                        button.click()
                        console.log('login!')
                    }, 1000)
                }
            }, 500)`;


        }

        // Inject JS to save login info after a successful login
        const injectScript = `
            let interval = setInterval(()=> {
                console.log('checking for save button')

                let btnArr = Array.from(document.querySelectorAll('button'))
                button = btnArr.find(btn => btn.innerText.trim() === 'Login');
                if(!button) {
                    button = btnArr.find(btn => btn.innerText.trim() === 'Logg inn');
                }


                if(button) {
                    button.addEventListener('click', () => {
                        const loginData = {
                            username: document.getElementById('inputUsername').value,
                            password: document.getElementById('inputPassword').value,
                        };
                        console.log(loginData)
                        require('electron').ipcRenderer.send('save-login-data', loginData);
                    });
                    console.log('set save action')
                    clearInterval(interval)

                    ${loginScript}
                }
            }, 500)
        `;


        mainWindow.webContents.executeJavaScript(injectScript);
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