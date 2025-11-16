# vite-plugin-console-pipe

[![npm version](https://badge.fury.io/js/vite-plugin-console-pipe.svg)](https://www.npmjs.com/package/vite-plugin-console-pipe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Vite plugin that forwards all browser console logs to your Vite dev server terminal during development. See client-side logs, warnings, errors, and stack traces directly in your terminal with source-mapped locations.

## ✨ Features

- 🔄 **Forwards all console methods**: `log`, `warn`, `error`, `info`, `debug`
- 🐛 **Captures unhandled errors** and promise rejections
- 🗺️ **Source map support**: Stack traces are mapped to original source locations
- ⚡ **Zero config**: Works out of the box
- 🎯 **Development only**: Only active during `vite serve`

## 📦 Installation

```bash
# pnpm
pnpm add -D vite-plugin-console-pipe

# npm
npm install -D vite-plugin-console-pipe

# yarn
yarn add -D vite-plugin-console-pipe
```

## 🚀 Usage

Add the plugin to your `vite.config.js` or `vite.config.ts`:

```js
import { defineConfig } from 'vite';
import consolePipe from 'vite-plugin-console-pipe';

export default defineConfig({
  plugins: [consolePipe()]
});
```

That's it! Start your development server:

```bash
npm run dev
```

Now all browser console output will appear in your terminal:


## 🎯 Use Cases

- **Mobile development**: Debug mobile browsers without opening DevTools
- **Headless testing**: See logs from automated browser tests
- **Multi-device testing**: Monitor logs from multiple devices simultaneously
- **CI/CD**: Capture browser logs during automated testing

## ⚙️ Configuration

This plugin works with zero configuration. It only runs during development (`vite serve`) and is automatically disabled in production builds.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Pearl-Pko](https://github.com/Pearl-Pko)

## 🔗 Links

- [GitHub Repository](https://github.com/Pearl-Pko/vite-plugin-console-pipe)
- [npm Package](https://www.npmjs.com/package/vite-plugin-console-pipe)
- [Report Issues](https://github.com/Pearl-Pko/vite-plugin-console-pipe/issues)
