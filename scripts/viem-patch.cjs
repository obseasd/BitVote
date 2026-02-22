/**
 * Preload script that patches Node.js module resolution
 * to redirect 'viem' imports to '@midl/viem'.
 *
 * Usage: node --require ./scripts/viem-patch.cjs ...
 */
const Module = require("module");
const path = require("path");

const midlViemPath = path.dirname(
  require.resolve("@midl/viem/package.json")
);

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  // Redirect viem/* to @midl/viem/*
  if (request === "viem" || request.startsWith("viem/")) {
    const newRequest = request.replace(/^viem/, midlViemPath);
    try {
      return originalResolveFilename.call(this, newRequest, parent, isMain, options);
    } catch {
      // fallback to original if @midl/viem doesn't have the subpath
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

console.log("[viem-patch] Redirecting viem ->", midlViemPath);
