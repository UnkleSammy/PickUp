const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// react-native@0.74.x ships only `Libraries/Utilities/Platform.ios.js` and
// `Platform.android.js` — no `Platform.js` and no `Platform.web.js`. On web,
// Metro resolves the deep import `require('../Utilities/Platform')` made inside
// `Libraries/ReactPrivate/ReactNativePrivateInterface.js` and finds no web or
// default variant, which 500s the bundle. react-native-web vendors a
// web-compatible copy of a subset of react-native's internals under
// `dist/vendor/react-native`; route react-native deep imports through that copy
// on the `web` platform so they resolve.
const RN_WEB_VENDOR = path.join(
  __dirname,
  'node_modules/react-native-web/dist/vendor/react-native',
);

// Native-only packages with no web implementation. Their module-level code
// touches UIManager/TurboModules at import time, which crashes the web bundle.
// The app already guards their usage (e.g. GameMap's `canRenderMap`), so
// stubbing them to empty on web is safe.
const NATIVE_ONLY_WEB_PACKAGES = ['react-native-maps'];
const RN_LIBRARIES_ROOT = path.join(__dirname, 'node_modules/react-native/Libraries');

function resolveAsFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.web.js`,
    `${basePath}.native.js`,
    path.join(basePath, 'index.js'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

// Returns the react-native `Libraries/...` sub-path this request targets, or
// null if it is not a react-native deep import.
function reactNativeSubPath(context, moduleName) {
  if (typeof moduleName !== 'string') return null;

  if (moduleName.startsWith('react-native/Libraries/')) {
    return moduleName.slice('react-native/Libraries/'.length);
  }

  if (
    (moduleName.startsWith('./') || moduleName.startsWith('../')) &&
    context.originModulePath
  ) {
    const requested = path.resolve(path.dirname(context.originModulePath), moduleName);
    if (requested.startsWith(RN_LIBRARIES_ROOT + path.sep)) {
      return requested.slice(RN_LIBRARIES_ROOT.length + 1);
    }
  }

  return null;
}

// Set this BEFORE withNativeWind: css-interop (used by NativeWind) captures any
// existing `resolver.resolveRequest` and wraps it, so this stays in the chain.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Stub native-only packages (e.g. react-native-maps) to empty on web.
    if (
      typeof moduleName === 'string' &&
      NATIVE_ONLY_WEB_PACKAGES.some(
        (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`),
      )
    ) {
      return { type: 'empty' };
    }

    const subPath = reactNativeSubPath(context, moduleName);
    if (subPath) {
      // react-native-web vendors web-compatible copies of the react-native
      // internals it supports (e.g. Utilities/Platform). Use those when they
      // exist. Everything else under `react-native/Libraries/**` is a native
      // internal that react-native-web does not ship and that is never used on
      // web (react-native-web renders through react-dom) — stub it out so the
      // native renderer/Core/Image chain (and its TurboModule side effects)
      // never enters the web bundle.
      const vendorFile = resolveAsFile(path.join(RN_WEB_VENDOR, subPath));
      if (vendorFile) {
        return { type: 'sourceFile', filePath: vendorFile };
      }
      return { type: 'empty' };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
