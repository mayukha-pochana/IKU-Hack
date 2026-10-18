require('@smartspectra/node-sdk/preload');
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('careflowCapture', {
  start: token => ipcRenderer.invoke('careflow:start-capture', token),
  sign: values => ipcRenderer.invoke('careflow:sign-result', values),
  connectDemo: () => ipcRenderer.invoke('careflow:connect-demo'),
  saveCheckin: (token, consent) => ipcRenderer.invoke('careflow:save-checkin', token, consent),
});
