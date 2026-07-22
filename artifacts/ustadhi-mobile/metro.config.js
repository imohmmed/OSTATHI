const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Force Metro to use the mobile app dir as project root,
// overriding any pnpm-workspace auto-detection in getDefaultConfig.
config.projectRoot = projectRoot;

// Watch workspace root so pnpm symlinks resolve correctly
config.watchFolders = [workspaceRoot];

config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  blockList: [
    new RegExp(`^${escapeRegex(path.resolve(workspaceRoot, 'artifacts', 'api-server'))}[/\\\\].*$`),
    /.*base64id_tmp.*/,
    /.*[/\\]\.pnpm[/\\].*_tmp.*/,
  ],
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
