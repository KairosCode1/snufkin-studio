'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Activar clase .electron-app en body para ajustes visuales (padding barra de título, etc.)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-app');
});

// Expose a safe, minimal API to the renderer (web UI)
contextBridge.exposeInMainWorld('electronAPI', {
  /** true when running inside Electron (not a plain browser) */
  isElectron: true,

  /** Get current settings state (API key masked) */
  getSettings: () => ipcRenderer.invoke('settings:get'),

  /** Save settings. data = { groqApiKey: string } */
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),

  /** Remove the stored Groq API key */
  deleteGroqKey: () => ipcRenderer.invoke('settings:delete-key'),

  /** Activation */
  activationCheck:    ()       => ipcRenderer.invoke('activation:check'),
  activationValidate: (code)   => ipcRenderer.invoke('activation:validate', code),

  /** Auto-update */
  updateInstall:  ()  => ipcRenderer.invoke('update:install'),
  updateVersion:  ()  => ipcRenderer.invoke('update:version'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_e, info) => cb(info)),
  onUpdateProgress:  (cb) => ipcRenderer.on('update:progress',  (_e, info) => cb(info)),
  onUpdateReady:     (cb) => ipcRenderer.on('update:ready',     (_e, info) => cb(info)),

  /** Frameless window controls */
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow:    () => ipcRenderer.send('window:close'),
});
