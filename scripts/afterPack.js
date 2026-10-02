const fs = require('fs');
const path = require('path');

module.exports = async (context) => {
    const appPath = context.appOutDir;
    const chromeSandboxPath = path.join(appPath, 'chrome-sandbox');

    try {
        // Change ownership and permissions for chrome-sandbox
        fs.chmodSync(chromeSandboxPath, 0o4755); // Set to mode 4755
        console.log(`Set proper permissions for: ${chromeSandboxPath}`);
    } catch (error) {
        console.error(`Failed to set permissions for chrome-sandbox: ${error}`);
    }
};