const { contextBridge } = require("electron");

// A read-only marker, with no filesystem, shell or IPC access for the renderer.
contextBridge.exposeInMainWorld(
  "pitwallDesktop",
  Object.freeze({ isDesktop: true }),
);
