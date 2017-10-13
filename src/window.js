const electron = require('electron');
const {app, BrowserWindow, Menu, ipcMain, dialog} = electron;
const windowStateKeeper = require('electron-window-state');
const appSettings = require('electron-settings');
const electronPrompt = require('electron-prompt');
const {EventEmitter} = require('events');

const path = require('path');
const url = require('url');

const ee = new EventEmitter();
let shouldQuit = false;
let mainWindow = null;
let windowDomReady = false;
let onWindowDomReady = [];
let menuTemplate = null;
let touchBar = null;
let onAppReady = [];
let appReady = false;

function createWindow() {
    let windowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800
    });
    
    mainWindow = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        minHeight: 200,
        minWidth: 420,
        darkTheme: true,
        backgroundColor: "#000",
        titleBarStyle: process.platform === 'darwin' ? 'hidden-inset' : 'default'
    });
    
    windowState.manage(mainWindow);

    mainWindow.on('close', (event) => {
        if(process.platform === 'darwin') {
            if(!shouldQuit) {
                event.preventDefault();
                mainWindow.hide();
                mainWindow.setSkipTaskbar(true);
                return;
            }
        }
        ee.emit('close', mainWindow);
    });

    mainWindow.on('enter-full-screen', () => {
        if(process.platform === 'darwin') {
            mainWindow.setClosable(false);
        }
        ee.emit('enter-full-screen', mainWindow);
    });

    mainWindow.on('leave-full-screen', () => {
        if(process.platform === 'darwin') {
            mainWindow.setClosable(true);
        }
        ee.emit('leave-full-screen', mainWindow);
    });

    mainWindow.webContents.on('did-start-loading', () => {
        windowDomReady = false;
        ee.emit('navigate', mainWindow.webContents);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        ee.emit('navigated', mainWindow.webContents);
    });

    mainWindow.webContents.on('dom-ready', () => {
        windowDomReady = true;
        const fns = onWindowDomReady;
        onWindowDomReady = [];

        ee.emit('dom-ready', mainWindow.webContents);

        for(let i = 0; i < fns.length; i++) {
            setImmediate(fns[i], mainWindow.webContents);
        }
    });

    if(menuTemplate !== null) {
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
    }

    if (process.platform === 'darwin' && touchBar !== null) {
        mainWindow.setTouchBar(touchBar);
    }

    ee.emit('ready', mainWindow);
}

function create(fn) {
    const lfn = () => {
        if(!isRunning()) {
            createWindow();
        }
        if(typeof(fn) === 'function') {
            setImmediate(fn, mainWindow);
        }
    };
    if(appReady) {
        setImmediate(lfn);
    } else {
        onAppReady.push(lfn);
    }
}

function ready(fn) {
    create(() => {
        if(windowDomReady) {
            setImmediate(fn, mainWindow.webContents);
        } else {
            onWindowDomReady.push(fn);
        }
    });
}

function setMenuTemplate(m) {
    menuTemplate = m;
}

function setTouchBar(t) {
    touchBar = t;
}

app.on('ready', () => {
    appReady = true;
    const fns = onAppReady;
    onAppReady = [];
    for(let i = 0; i < fns.length; i++) {
        setImmediate(fns[i]);
    }
});

app.on('before-quit', () => {
    shouldQuit = true;
});

function isRunning() {
    return mainWindow !== null;
}

function send(event, obj) {
    if(isRunning()) {
        mainWindow.send(event, obj);
    }
}

function show() {
    if(mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.focus();
      	mainWindow.show();
      	mainWindow.setSkipTaskbar(false);
    }
    processCommandLine(commandLine, workingDirectory);
}

function prompt(options) {
    return electronPrompt(options, mainWindow);
}

function messageBox(options, callback) {
    return dialog.showMessageBox(mainWindow, options, callback);
}

module.exports = Object.assign(ee, {
    create,
    ready,
    send,
    setMenuTemplate, 
    setTouchBar,
    isRunning,
    prompt,
    messageBox,
    show
});