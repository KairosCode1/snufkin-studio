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

// ── Single-instance lock: si ya hay otra instancia, traerla al frente y salir
//    Esto evita doble-click → 2 Electrons compitiendo por el puerto 7331
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[electron] Otra instancia ya está corriendo, saliendo.');
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  // Cuando alguien intenta abrir SnufkinStudio una segunda vez, traer la
  // ventana existente al frente en lugar de abrir otra
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else if (loadingWindow) {
    loadingWindow.show();
    loadingWindow.focus();
  }
});

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
  // IMPORTANT: on Windows process.env stores PATH as "Path" (not "PATH").
  // Using env.PATH directly creates a *new* key and loses the full system PATH.
  // We must find the real key name and modify it in-place.
  const sep = process.platform === 'win32' ? ';' : ':';
  if (fs.existsSync(tools)) {
    const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
    env[pathKey] = [tools, nodeDir, env[pathKey] || ''].filter(Boolean).join(sep);
  }

  // Explicit exe paths — only set if the files actually exist (dev vs packaged)
  const ffmpegExe  = path.join(tools, 'ffmpeg.exe');
  const ffprobeExe = path.join(tools, 'ffprobe.exe');
  const npxCmd     = path.join(nodeDir, 'npx.cmd');

  if (fs.existsSync(ffmpegExe))  env.FFMPEG_EXE  = ffmpegExe;
  if (fs.existsSync(ffprobeExe)) env.FFPROBE_EXE = ffprobeExe;
  if (fs.existsSync(npxCmd))     env.NPX_CMD      = npxCmd;

  // ── Auto-detect browser for HyperFrames (HYPERFRAMES_BROWSER_PATH) ──────────
  // HyperFrames needs Chrome/Edge to render video. We try common install paths
  // so it works on any Windows 10/11 machine without manual setup.
  if (!env.HYPERFRAMES_BROWSER_PATH) {
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const browserCandidates = [
      // Puppeteer cache (installed by hyperframes doctor)
      path.join(userProfile, '.cache', 'puppeteer', 'chrome-headless-shell', 'win64-stable', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      path.join(userProfile, '.cache', 'puppeteer', 'chrome', 'win64-stable', 'chrome-win64', 'chrome.exe'),
      // Google Chrome — per-user install (most common on Windows)
      path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Google Chrome — system-wide installs
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      // Microsoft Edge — always present on Windows 10/11
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
    const foundBrowser = browserCandidates.find(p2 => {
      try { return fs.existsSync(p2); } catch { return false; }
    });
    if (foundBrowser) {
      env.HYPERFRAMES_BROWSER_PATH = foundBrowser;
      logToFile(`[browser] Found browser: ${foundBrowser}`);
    } else {
      logToFile('[browser] WARNING: No browser found — HyperFrames render may fail');
    }
  }

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

// ── Logging a archivo (para diagnosticar fallos cuando Electron está oculto) ──

function getLogFile() {
  try {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'electron-startup.log');
  } catch {
    return path.join(require('os').homedir(), 'snufkin-electron-startup.log');
  }
}

function logToFile(msg) {
  try {
    fs.appendFileSync(
      getLogFile(),
      `[${new Date().toISOString()}] ${msg}\n`,
      'utf8'
    );
  } catch {}
}

// ── Buscar Python — SIEMPRE devuelve ruta absoluta para que spawn la encuentre ──

function _resolveAbsolute(cmd) {
  // Usar `where` (Win) o `which` (Unix) para obtener la ruta absoluta del exe
  try {
    const probe = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    const out = require('child_process').execSync(probe, {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
      encoding: 'utf8',
      shell: true,
    });
    const first = (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
    return first || null;
  } catch {
    return null;
  }
}

function _testExe(abs) {
  try {
    const out = require('child_process').execSync(`"${abs}" --version`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
      encoding: 'utf8',
      shell: true,
    });
    return (out || '').trim();
  } catch {
    return null;
  }
}

function findPythonExe() {
  const candidates = process.platform === 'win32'
    ? ['py', 'python', 'python3', 'py.exe', 'python.exe']
    : ['python3', 'python'];

  // 1. Resolver cada candidato a ruta absoluta vía `where` y verificar
  for (const cand of candidates) {
    const abs = _resolveAbsolute(cand);
    if (abs && fs.existsSync(abs)) {
      const ver = _testExe(abs);
      if (ver) {
        logToFile(`[python] OK via where: ${cand} -> ${abs} (${ver})`);
        return abs;
      }
      logToFile(`[python] where encontró ${abs} pero --version falló`);
    } else {
      logToFile(`[python] where no encontró ${cand}`);
    }
  }

  // 2. Fallback: rutas absolutas conocidas en Windows
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || '';
    const programs = process.env.ProgramFiles || 'C:\\Program Files';
    const absPaths = [
      'C:\\Windows\\py.exe',
      'C:\\Python314\\python.exe',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      `${localApp}\\Programs\\Python\\Python314\\python.exe`,
      `${localApp}\\Programs\\Python\\Python313\\python.exe`,
      `${localApp}\\Programs\\Python\\Python312\\python.exe`,
      `${localApp}\\Programs\\Python\\Python311\\python.exe`,
      `${programs}\\Python314\\python.exe`,
      `${programs}\\Python313\\python.exe`,
    ];
    for (const p of absPaths) {
      if (fs.existsSync(p)) {
        const ver = _testExe(p);
        if (ver) {
          logToFile(`[python] OK via abs path: ${p} (${ver})`);
          return p;
        }
      }
    }
  } else {
    const absPaths = ['/usr/bin/python3', '/usr/local/bin/python3', '/usr/bin/python'];
    for (const p of absPaths) if (fs.existsSync(p)) return p;
  }

  logToFile('[python] *** NO PYTHON FOUND EN NINGÚN SITIO ***');
  return null;
}

// ── Start Python backend ──────────────────────────────────────────────────────

let pythonExeCached = null;

function startServer() {
  const env = buildEnv();

  if (app.isPackaged) {
    // Production: run the PyInstaller-built server.exe
    const exe = path.join(serverDir(), 'server.exe');
    logToFile(`[server] Starting packaged exe: ${exe}`);
    serverProcess = spawn(exe, [], {
      env,
      cwd: serverDir(),
      windowsHide: true,
    });
  } else {
    // Dev mode: encontrar Python (cache para no buscar dos veces en el retry)
    if (!pythonExeCached) pythonExeCached = findPythonExe();
    const py = pythonExeCached;
    const script = path.join(__dirname, '..', 'server.py');

    if (!py) {
      logToFile('[server] ABORTANDO: no se encontró Python en el sistema');
      serverProcess = null;
      return;
    }

    logToFile(`[server] Spawning: "${py}" "${script}" (cwd=${path.join(__dirname, '..')})`);
    try {
      serverProcess = spawn(py, [script], {
        env,
        cwd: path.join(__dirname, '..'),
        windowsHide: true,
        shell: false,
      });
    } catch (e) {
      logToFile(`[server] spawn() exception: ${e.message}`);
      serverProcess = null;
      return;
    }
  }

  if (!serverProcess) return;

  logToFile(`[server] Spawned PID ${serverProcess.pid}`);

  serverProcess.stdout.on('data', (d) => {
    const s = '[server] ' + d.toString();
    process.stdout.write(s);
    logToFile(s.trimEnd());
  });
  serverProcess.stderr.on('data', (d) => {
    const s = '[server-err] ' + d.toString();
    process.stderr.write(s);
    logToFile(s.trimEnd());
  });
  serverProcess.on('error', (e) => {
    const msg = `[server] spawn error: ${e.message}`;
    console.error(msg);
    logToFile(msg);
  });
  serverProcess.on('exit', (code) => {
    const msg = `[server] exited with code ${code}`;
    console.log(msg);
    logToFile(msg);
  });
}

// ── Kill any process already listening on a port ─────────────────────────────

function killPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    if (process.platform !== 'win32') {
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, () => resolve());
      return;
    }
    // Windows: find PID listening on port, then taskkill it
    exec(`netstat -aon`, { shell: true }, (_err, stdout) => {
      const pids = new Set();
      for (const line of (stdout || '').split('\n')) {
        if (!line.includes(`0.0.0.0:${port}`) && !line.includes(`127.0.0.1:${port}`)) continue;
        if (!line.includes('LISTENING')) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      }
      if (pids.size === 0) return resolve();
      console.log(`[electron] Killing orphan PIDs on port ${port}:`, [...pids]);
      const cmds = [...pids].map(p => `taskkill /F /PID ${p}`).join(' & ');
      exec(cmds, { shell: true }, () => resolve());
    });
  });
}

// ── Wait for FastAPI to be ready ──────────────────────────────────────────────

function waitForServer(maxMs = 120000) {
  return new Promise((resolve) => {
    const started = Date.now();
    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
        res.resume();
        resolve(true);
      });
      req.setTimeout(1500);
      req.on('error', () => {
        if (Date.now() - started > maxMs) {
          resolve(false);
        } else {
          setTimeout(check, 800);
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
    icon:        path.join(__dirname, 'icon.ico'),
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
    icon:            path.join(__dirname, 'icon.ico'),
    frame:           false,
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

  // Limpiar log de arranque anterior
  try { fs.writeFileSync(getLogFile(), `=== SnufkinStudio launch ${new Date().toISOString()} ===\n`, 'utf8'); } catch {}
  logToFile(`[main] electron version ${process.versions.electron}, node ${process.versions.node}`);
  logToFile(`[main] app.isPackaged=${app.isPackaged}, __dirname=${__dirname}`);
  logToFile(`[main] PATH=${(process.env.PATH || '').slice(0, 300)}...`);

  // ── Paso 1: limpiar puerto antes de arrancar (huérfanos de sesiones anteriores) ──
  await killPort(PORT);

  startServer();

  // ── Si el server no arrancó (Python no encontrado, spawn falló): abortar YA ──
  if (!serverProcess) {
    if (loadingWindow && !loadingWindow.isDestroyed()) loadingWindow.close();
    let logTail = '';
    try {
      const log = fs.readFileSync(getLogFile(), 'utf8');
      logTail = '\n\nLog:\n' + log.split('\n').slice(-15).join('\n');
    } catch {}
    dialog.showErrorBox(
      'SnufkinStudio — Python no encontrado',
      'No se pudo encontrar Python instalado en el sistema.\n\n' +
      'Para arreglarlo:\n' +
      '  1. Instala Python 3.10 o superior desde https://www.python.org\n' +
      '  2. Durante la instalación marca "Add Python to PATH"\n' +
      '  3. Reinicia el PC\n' +
      '  4. Vuelve a abrir SnufkinStudio\n\n' +
      `Log: ${getLogFile()}` +
      logTail
    );
    app.quit();
    return;
  }

  // ── Detectar si el server muere antes de responder ──────────────────────────
  let serverDiedEarly = false;
  serverProcess.on('exit', (code) => {
    if (!mainWindow) serverDiedEarly = true;
    logToFile(`[main] Detected early server exit code=${code}`);
  });

  // Loading screen mínimo 4.5 s aunque el servidor arranque antes
  // Si el server muere de golpe (import error, etc.), salir del wait inmediatamente
  const waitWithEarlyExit = (ms) => {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (serverDiedEarly) { clearInterval(check); resolve(false); }
      }, 300);
      waitForServer(ms).then((r) => { clearInterval(check); resolve(r); });
    });
  };

  const [ready] = await Promise.all([
    waitWithEarlyExit(120000),
    new Promise(r => setTimeout(r, 4500)),
  ]);

  if (!ready) {
    // ── Segundo intento automático ────────────────────────────────────────────
    console.log('[electron] Primer intento falló, reintentando...');
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.executeJavaScript(
        'document.getElementById("status").textContent = "Reintentando arranque…"'
      ).catch(() => {});
    }

    // Matar proceso que quizá arrancó pero no responde, limpiar puerto de nuevo
    if (serverProcess && !serverProcess.killed) {
      try { serverProcess.kill('SIGTERM'); } catch (_) {}
      serverProcess = null;
    }
    await new Promise(r => setTimeout(r, 1500));
    await killPort(PORT);
    await new Promise(r => setTimeout(r, 500));

    serverDiedEarly = false;   // reset
    startServer();
    let ready2 = false;
    if (serverProcess) {
      serverProcess.on('exit', () => {
        if (!mainWindow) serverDiedEarly = true;
      });
      ready2 = await waitWithEarlyExit(90000);
    }

    if (!ready2) {
      if (loadingWindow && !loadingWindow.isDestroyed()) loadingWindow.close();
      // Leer las últimas líneas del log para mostrarlas al usuario
      let logTail = '';
      try {
        const log = fs.readFileSync(getLogFile(), 'utf8');
        const lines = log.trim().split('\n');
        logTail = '\n\nLog (últimas 10 líneas):\n' + lines.slice(-10).join('\n');
      } catch {}
      dialog.showErrorBox(
        'SnufkinStudio — Error al iniciar',
        'No se pudo arrancar el servidor backend.\n\n' +
        'Posibles causas:\n' +
        '  • Python no está instalado o no está en el PATH\n' +
        '  • Otro programa usa el puerto 7331\n' +
        '  • Faltan dependencias (pip install -r requirements.txt)\n\n' +
        `Log completo: ${getLogFile()}` +
        logTail
      );
      app.quit();
      return;
    }
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
    try {
      // En Windows SIGTERM no siempre mata el proceso inmediatamente
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        try { execSync(`taskkill /F /T /PID ${serverProcess.pid}`, { stdio: 'ignore' }); } catch (_) {}
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (_) {}
    serverProcess = null;
  }
  // Limpiar el puerto por si acaso (async, no esperamos)
  killPort(PORT).catch(() => {});
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

// ── IPC: Activation ──────────────────────────────────────────────────────────
// Códigos válidos almacenados como SHA-256 (hex) del código en mayúsculas sin guiones.
// Para generar un nuevo código: node -e "const c=require('crypto');console.log(c.createHash('sha256').update('SNUFXXXX').digest('hex'))"
const VALID_CODE_HASHES = new Set([
  // SNUF-1234-AELI-5678
  '3e67326857b4c5344256bb0c9b90e663d82c11a72dbb3e23ba6be3b0b80e9ec1',
]);

const crypto = require('crypto');
function _hashCode(raw) {
  return crypto.createHash('sha256')
    .update(raw.toUpperCase().replace(/-/g, ''))
    .digest('hex');
}

ipcMain.handle('activation:check', () => {
  return { activated: store.get('activated', false) === true };
});

ipcMain.handle('activation:validate', (_event, code) => {
  if (!code || typeof code !== 'string') return { ok: false, error: 'Código inválido' };
  const normalized = code.trim();
  const hash = _hashCode(normalized);
  if (VALID_CODE_HASHES.has(hash)) {
    store.set('activated', true);
    store.set('activationCode', normalized.toUpperCase());
    return { ok: true };
  }
  return { ok: false, error: 'Código incorrecto. Contacta con soporte.' };
});

// ── IPC: Window controls (frameless) ─────────────────────────────────────────
ipcMain.on('window:minimize',  () => mainWindow?.minimize());
ipcMain.on('window:maximize',  () => {
  if (mainWindow?.isMaximized()) mainWindow.restore();
  else mainWindow?.maximize();
});
ipcMain.on('window:close',     () => mainWindow?.close());
