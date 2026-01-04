# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

whatsapp-web.js is a WhatsApp API client that connects to WhatsApp Web via Puppeteer, providing programmatic access to WhatsApp functionality through Node.js. The library launches a real WhatsApp Web browser instance and injects code to expose internal WhatsApp Web functions.

**Target WhatsApp Web version**: 2.3000.1017054665
**Node version required**: v18 or higher

## Development Commands

### Testing
```bash
npm test                    # Run all tests (mocha, 5s timeout)
npm run test-single         # Run a single test file: npm run test-single tests/client.js
```

### Documentation
```bash
npm run generate-docs       # Generate JSDoc documentation in docs/
```

### Development Shell
```bash
npm run shell              # Start interactive REPL with initialized client (headless=false)
```

### Linting
```bash
npx eslint src/            # Lint source files
npx eslint --fix src/      # Auto-fix linting issues
```

ESLint config: 4-space indentation, single quotes, semicolons required, unix line endings.

## Architecture

### Core Components

**Client (`src/Client.js`)**
The main entry point extending EventEmitter. Manages the Puppeteer browser instance, handles authentication, coordinates injection of code into WhatsApp Web, and emits events for messages, QR codes, authentication state, etc.

**Authentication Strategies (`src/authStrategies/`)**
- `BaseAuthStrategy.js` - Abstract base class
- `NoAuth.js` - No session persistence (re-authenticate each time)
- `LocalAuth.js` - Saves session to local filesystem (`.wwebjs_auth/session-{clientId}/`)
- `RemoteAuth.js` - Saves session to remote storage (implement custom store)

Authentication strategies hook into the client lifecycle via `beforeBrowserInitialized()`, `afterBrowserInitialized()`, `onAuthenticationNeeded()`, etc.

**Injected Code (`src/util/Injected/`)**
Code injected into the WhatsApp Web page context to expose internal WhatsApp modules:
- `Store.js` / `LegacyStore.js` - Exposes WhatsApp Web's internal Store modules via moduleRaid
- `AuthStore.js` / `LegacyAuthStore.js` - Exposes authentication-related modules
- `Utils.js` - Helper functions injected into the page

These files use `window.require()` to access WhatsApp Web's internal webpack modules and expose them as `window.Store.*`.

**Structures (`src/structures/`)**
Object-oriented wrappers around WhatsApp Web entities:
- `Chat.js` - Base chat class
- `PrivateChat.js`, `GroupChat.js`, `Channel.js` - Chat type specializations
- `Message.js` - Message with methods like `reply()`, `delete()`, `react()`
- `Contact.js`, `PrivateContact.js`, `BusinessContact.js`
- `MessageMedia.js` - Media attachment handling
- `Poll.js`, `Location.js`, `Label.js`, etc.

All structures extend `Base.js` which provides `_patch()` for updating from raw data.

**Factories (`src/factories/`)**
- `ChatFactory.js` - Creates appropriate Chat subclass instances
- `ContactFactory.js` - Creates appropriate Contact subclass instances

**WebCache (`src/webCache/`)**
Manages caching of WhatsApp Web version information:
- `LocalWebCache.js` - Caches to local filesystem
- `RemoteWebCache.js` - Caches to remote storage
- `WebCacheFactory.js` - Factory for creating cache instances

### Key Utilities

**InterfaceController (`src/util/InterfaceController.js`)**
Controls WhatsApp Web UI interactions by calling injected functions: opening chats, drawers, searching, scrolling to messages.

**Puppeteer utilities (`src/util/Puppeteer.js`)**
Helper functions for Puppeteer operations.

**Constants (`src/util/Constants.js`)**
Defines events, states, message types, and default client options.

### Data Flow

1. **Initialization**: Client → AuthStrategy.beforeBrowserInitialized() → Launch Puppeteer → Inject code
2. **Authentication**: Emit 'qr' or 'code' events → User scans/enters → AuthStrategy saves session
3. **Message Reception**: WhatsApp Web fires event → Injected code catches it → Client emits 'message' with Message structure
4. **Message Sending**: User calls `client.sendMessage()` → Client evaluates function in page context → Injected Store modules send message

### Important Patterns

**Module Injection**
The library uses `@pedroslopez/moduleraid` to expose WhatsApp Web's internal webpack modules. Code is injected via `page.evaluateOnNewDocument()` and `page.evaluate()`.

**Event-Driven API**
The Client emits events for all WhatsApp activities. Users listen to events like `'message'`, `'qr'`, `'ready'`, `'authenticated'`, etc.

**Puppeteer Page Context**
Most WhatsApp Web interactions happen via `page.evaluate()` calls that execute code in the browser context where `window.Store` is available.

**Structure Hydration**
Raw data from WhatsApp Web is wrapped in Structure classes via `._patch(data)` which updates properties while maintaining methods.

## Development Notes

### Working with WhatsApp Web Versions

WhatsApp Web frequently changes its internal structure. The codebase uses version comparison (`compareWwebVersions()` in Store.js) to handle different WhatsApp Web versions. When WhatsApp Web updates break functionality, you may need to update the injected Store mappings.

### Session Persistence

LocalAuth stores session data in Puppeteer's userDataDir. The session includes authentication state, keys, and cached data. Never commit `.wwebjs_auth/` directories.

### Testing with Real WhatsApp

Tests in `tests/` directory interact with real WhatsApp Web. You need a test WhatsApp account and will need to authenticate during tests unless using a saved session.

### Adding New Features

1. Check if the feature exists in WhatsApp Web's UI
2. Find the relevant Store module in WhatsApp Web's bundled code
3. Expose it in `src/util/Injected/Store.js` or related files
4. Add a method to the appropriate Structure class
5. Test with real WhatsApp Web instance via `npm run shell`

### Puppeteer Configuration

Client accepts puppeteer options via `options.puppeteer`. Common options:
- `headless: false` - Show browser (useful for debugging)
- `args: ['--no-sandbox']` - Bypass sandboxing (for containers)
- `executablePath` - Custom Chrome/Chromium path

### Media Handling

Sending videos/GIFs requires Google Chrome (not Chromium) due to proprietary codec support. The library uses fluent-ffmpeg for video processing when sending stickers.
