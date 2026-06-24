const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // All theme tokens (--color-*, --text-*, --leading-*, --font-*) are static
  // hex/rem values (no PlatformColor/dynamic colors), so inlining is safe and
  // REQUIRED: utilities like bg-surface / text-gold / text-xl compile to
  // var(--color-surface) etc., which RN cannot resolve unless they are inlined
  // to literal values here. Leaving this off was the root cause of styles
  // (colors, font sizes) not applying on pages that rely on className tokens.
  inlineVariables: true,
  // We add className support manually via react-native-css wrappers
  globalClassNamePolyfill: false,
});
