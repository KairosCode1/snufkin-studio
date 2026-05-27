'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path   = require('path');
const http   = require('http');
const { spawn } = require('child_process');
const fs     = require('fs');

// ── Auto-updater (solo en build empaquetado, no en dev) ───────────────────────
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload         = true;  // descarga en segundo plano
  autoUpdater.autoInstallOnAppQuit = true;  // instala al cerrar si ya descargó
} catch (_) {
  // en dev, electron-updater puede no estar instalado aún
  console.log('[updater] electron-updater no disponible (modo dev)');
}

// ── Minimal persistent store (plain JSON, no external dep) ───────────────────
const _storeFile = () => {
  try { return path.join(app.getPath('userData'), 'snufkin-config.json'); }
  catch { return path.join(require('os').homedir(), '.snufkin-config.json'); }
};

const store = {
  _data: null,
  _load() {
    if (this._data) return;
    try { this._data = JSON.parse(fs.readFileSync(_storeFile(), 'utf8')); }
    catch { this._data = {}; }
  },
  get(key, def = undefined) {
    this._load();
    return key in this._data ? this._data[key] : def;
  },
  set(key, value) {
    this._load();
    this._data[key] = value;
    try { fs.writeFileSync(_storeFile(), JSON.stringify(this._data, null, 2), 'utf8'); } catch {}
  },
  delete(key) {
    this._load();
    delete this._data[key];
    try { fs.writeFileSync(_storeFile(), JSON.stringify(this._data, null, 2), 'utf8'); } catch {}
  },
};

const PORT = 7331;
let mainWindow    = null;
let loadingWindow = null;
let serverProcess = null;

// ── Path helpers ─────────────────────────────────────────────────────────────

function resourcesPath() {
  // In packaged app: process.resourcesPath points to <install>/resources/
  // In dev mode: fall back to project root
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
}

function toolsPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'tools')
    : path.join(__dirname, '..', 'resources', 'tools');
}

function serverDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, '..');
}

function staticDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'static')
    : path.join(__dirname, '..', 'static');
}

// ── Build subprocess environment ─────────────────────────────────────────────

function buildEnv() {
  const tools   = toolsPath();
  const nodeDir = path.join(tools, 'node');
  const groqKey = store.get('groqApiKey', '') || '';

  const env = Object.assign({}, process.env);

  // Prepend bundled tools to PATH so Python subprocesses find ffmpeg + npx
  const sep = process.platform === 'win32' ? ';' : ':';
  if (fs.existsSync(tools)) {
    env.PATH = [tools, nodeDir, env.PATH || ''].filter(Boolean).join(sep);
  }

  // Explicit exe paths — only set if the files actually exist (dev vs packaged)
  const ffmpegExe  = path.join(tools, 'ffmpeg.exe');
  const ffprobeExe = path.join(tools, 'ffprobe.exe');
  const npxCmd     = path.join(nodeDir, 'npx.cmd');

  if (fs.existsSync(ffmpegExe))  env.FFMPEG_EXE  = ffmpegExe;
  if (fs.existsSync(ffprobeExe)) env.FFPROBE_EXE = ffprobeExe;
  if (fs.existsSync(npxCmd))     env.NPX_CMD      = npxCmd;

  // Static files dir (needed so server.py can mount /static correctly)
  env.APP_STATIC_DIR = staticDir();

  // Workspace dir — writable location for input/, output/, projects/, config.json
  const workspace = path.join(app.getPath('userData'), 'workspace');
  env.APP_WORKSPACE = workspace;
  fs.mkdirSync(workspace, { recursive: true });

  // npm cache inside app userData so it's writable and persists across runs
  env.npm_config_cache = path.join(app.getPath('userData'), 'npm-cache');

  // API key
  if (groqKey) env.GROQ_API_KEY = groqKey;

  return env;
}

// ── Start Python backend ──────────────────────────────────────────────────────

function startServer() {
  const env = buildEnv();

  if (app.isPackaged) {
    // Production: run the PyInstaller-built server.exe
    const exe = path.join(serverDir(), 'server.exe');
    console.log('[electron] Starting server:', exe);
    serverProcess = spawn(exe, [], {
      env,
      cwd: serverDir(),
      windowsHide: true,
    });
  } else {
    // Development: find Python executable (Windows can be 'py', 'python', or 'python3')
    const script  = path.join(__dirname, '..', 'server.py');
    const pyCands = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
    let   py      = pyCands[0];
    for (const cand of pyCands) {
      try {
        require('child_process').execSync(`${cand} --version`, { stdio: 'ignore', timeout: 3000 });
        py = cand;
        break;
      } catch {}
    }
    console.log('[electron] Dev mode — starting:', py, script);
    serverProcess = spawn(py, [script], {
      env,
      cwd: path.join(__dirname, '..'),
      windowsHide: true,
    });
  }

  serverProcess.stdout.on('data', (d) => process.stdout.write('[server] ' + d));
  serverProcess.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
  serverProcess.on('error', (e) => console.error('[server] spawn error:', e.message));
  serverProcess.on('exit', (code) => console.log('[server] exited with code', code));
}

// ── Wait for FastAPI to be ready ──────────────────────────────────────────────

function waitForServer(maxMs = 60000) {
  return new Promise((resolve) => {
    const started = Date.now();
    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
        res.resume();
        resolve(true);
      });
      req.setTimeout(1000);
      req.on('error', () => {
        if (Date.now() - started > maxMs) {
          resolve(false);
        } else {
          setTimeout(check, 600);
        }
      });
      req.on('timeout', () => req.destroy());
    }
    check();
  });
}

// ── Windows ───────────────────────────────────────────────────────────────────

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width:       460,
    height:      300,
    frame:       false,
    transparent: true,
    resizable:   false,
    center:      true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
}

function createMainWindow() {
  // Quitar el menú nativo (File / Edit / View / Window / Help)
  Menu.setApplicationMenu(null);

  // Abrir un 35% más grande que el tamaño anterior, pero sin salirse de la pantalla
  const { width: sw, height: sh } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.min(1755, Math.round(sw * 0.92));
  const winH = Math.min(1188, Math.round(sh * 0.92));

  mainWindow = new BrowserWindow({
    width:           winW,
    height:          winH,
    minWidth:        900,
    minHeight:       600,
    show:            false,
    backgroundColor: '#050506',
    // Marco oscuro: barra de título nativa pero en gris oscuro
    titleBarStyle:   'hidden',
    titleBarOverlay: {
      color:       '#0d0d11',   // fondo de la barra — gris muy oscuro
      symbolColor: '#6b7280',   // iconos de min/max/cerrar — gris medio
      height:      36,
    },
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[electron] page load failed:', code, desc);
  });

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();

    // ── Comprobar actualizaciones (solo en app empaquetada) ────────────────
    if (autoUpdater && app.isPackaged) {
      autoUpdater.on('update-available', (info) => {
        dialog.showMessageBox(mainWindow, {
          type:    'info',
          title:   'Actualización disponible',
          message: `Nueva versión ${info.version} disponible`,
          detail:  'Se descargará en segundo plano mientras trabajas.',
          buttons: ['OK'],
          icon:    null,
        }).catch(() => {});
      });

      autoUpdater.on('update-downloaded', (info) => {
        dialog.showMessageBox(mainWindow, {
          type:    'info',
          title:   'Actualización lista para instalar',
          message: `SnufkinStudio ${info.version} está listo`,
          detail:  'Reinicia la aplicación para instalar la nueva versión.',
          buttons: ['Reiniciar ahora', 'Más tarde'],
          icon:    null,
        }).then((result) => {
          if (result.response === 0) autoUpdater.quitAndInstall(false, true);
        }).catch(() => {});
      });

      autoUpdater.on('error', (err) => {
        console.error('[updater] error:', err.message);
      });

      // Comprobar con un pequeño delay para no bloquear el arranque
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((e) => {
          console.log('[updater] checkForUpdates falló:', e.message);
        });
      }, 5000);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in the OS browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createLoadingWindow();
  startServer();

  // Loading screen mínimo 3.5 segundos aunque el servidor arranque antes
  const [ready] = await Promise.all([
    waitForServer(60000),
    new Promise(r => setTimeout(r, 4500)),
  ]);

  if (!ready) {
    dialog.showErrorBox(
      'SnufkinStudio — Error al iniciar',
      'No se pudo arrancar el servidor backend.\n\nComprueba que la instalación está completa e inténtalo de nuevo.'
    );
    app.quit();
    return;
  }

  createMainWindow();
});

app.on('window-all-closed', () => {
  killServer();
  app.quit();
});

app.on('before-quit', killServer);

function killServer() {
  if (serverProcess && !serverProcess.killed) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
    serverProcess = null;
  }
}

// ── IPC: Settings bridge ──────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => {
  const key = store.get('groqApiKey', '');
  return {
    groqApiKeySet:    Boolean(key),
    groqApiKeyMasked: key ? key.slice(0, 8) + '...' + key.slice(-4) : '',
  };
});

ipcMain.handle('settings:save', async (_event, data) => {
  if (typeof data.groqApiKey === 'string') {
    const trimmed = data.groqApiKey.trim();
    store.set('groqApiKey', trimmed);

    // Notify the running Python server so it takes effect immediately
    const body = JSON.stringify({ groq_api_key: trimmed });
    await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port:     PORT,
          path:     '/api/settings',
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => { res.resume(); resolve(); }
      );
      req.on('error', resolve);
      req.write(body);
      req.end();
    });
  }
  return { ok: true };
});

ipcMain.handle('settings:delete-key', async () => {
  store.delete('groqApiKey');
  await new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path: '/api/settings/groq_api_key', method: 'DELETE' },
      (res) => { res.resume(); resolve(); }
    );
    req.on('error', resolve);
    req.end();
  });
  return { ok: true };
});
