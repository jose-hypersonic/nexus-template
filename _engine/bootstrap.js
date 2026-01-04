(function () {
    if (globalThis.__engine) return;

    const UE = require('ue');
    const puerts = require('puerts');
    const WebUI = require('./nexus/webui');
    const Input = require('./nexus/input');
    const Nexus = require('./nexus/index');
    const Player = require('./nexus/player');
    const Database = require('./nexus/database');

    if (!globalThis.__characterStore) {
        globalThis.__characterStore = {};
    }

    const engine = {
        UE,
        puerts,
        WebUI,
        Input,
        Nexus,
        Player,
        Database
    };

    Object.defineProperty(globalThis, "UE", {
        value: UE,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "puerts", {
        value: puerts,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "WebUI", {
        value: WebUI,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "Input", {
        value: Input,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "Nexus", {
        value: Nexus,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "Player", {
        value: Player,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "Database", {
        value: Database,
        writable: false,
        configurable: false
    });

    Object.defineProperty(globalThis, "__engine", {
        value: engine,
        writable: false,
        configurable: false
    });
})();
