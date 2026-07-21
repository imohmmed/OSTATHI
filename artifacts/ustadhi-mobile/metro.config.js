const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Block server-only packages and pnpm temp files from Metro watcher
config.resolver = {
  ...config.resolver,
  blockList: [
    // Exclude the api-server (server-only code)
    new RegExp(`^${escapeRegex(path.resolve(workspaceRoot, 'artifacts', 'api-server'))}[/\\\\].*$`),
    // Exclude pnpm temp files (created by base64id / socket.io)
    /.*base64id_tmp.*/,
    /.*[/\\]\.pnpm[/\\].*_tmp.*/,
  ],
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
