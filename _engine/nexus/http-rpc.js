const http = require('http');
const Context = require('./context');
const UE = require('ue');
const Logger = require('./logger');

if (!global.__NexusHttpRpcState) {
    global.__NexusHttpRpcState = {
        endpoints: {},
        server: null,
        port: 17420,
        logBuffer: [],
        maxLogs: 1000,
        logClients: [],
        consoleIntercepted: false,
        host: '127.0.0.1'
    }
}

const state = global.__NexusHttpRpcState

function addLog(source, level, message) {
    const log = {
        timestamp: new Date().toISOString(),
        source,
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message)
    };
    state.logBuffer.push(log);
    if (state.logBuffer.length > state.maxLogs) state.logBuffer.shift();
    
    state.logClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(log)}\n\n`);
        } catch (e) {}
    });
}

function interceptConsole() {
    if (state.consoleIntercepted) return
    state.consoleIntercepted = true

    const source = Context.isServer() ? 'server' : 'client';
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = function(...args) {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        originalLog.apply(console, args);
        try {
            addLog(source, 'log', msg);
            if (Context.isClient()) {
                sendLogToServer('log', msg);
            }
        } catch (e) {
            originalLog('[HTTP RPC] Log intercept error:', e);
        }
    };
    
    console.error = function(...args) {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        originalError.apply(console, args);
        try {
            addLog(source, 'error', msg);
            if (Context.isClient()) {
                sendLogToServer('error', msg);
            }
        } catch (e) {
            originalError('[HTTP RPC] Error intercept error:', e);
        }
    };
    
    console.warn = function(...args) {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        originalWarn.apply(console, args);
        try {
            addLog(source, 'warn', msg);
            if (Context.isClient()) {
                sendLogToServer('warn', msg);
            }
        } catch (e) {
            originalWarn('[HTTP RPC] Warn intercept error:', e);
        }
    };
}

function sendLogToServer(level, message) {
    const postData = JSON.stringify({ level, message });
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(`http://${state.host}:${state.port}/log`, options);
    req.on('error', () => {});
    req.write(postData);
    req.end();
}

function endpoint(name, fn) {
    Logger.logGeneral('HTTP-RPC', `Registering endpoint: ${name}`);
    state.endpoints[name] = fn;
}

function startServer() {
    if (!Context.isServer() || state.server) return;
    
    Logger.logHttpServer(`Starting HTTP server on port ${state.port}`);
    
    state.server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (req.url === '/logs') {
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Nexus Logs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Consolas', 'Monaco', monospace; 
            background: #1e1e1e; 
            color: #d4d4d4;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #252526;
            padding: 15px 20px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .title { font-size: 18px; font-weight: bold; color: #fff; }
        .controls { display: flex; gap: 10px; }
        .btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn:hover { background: #1177bb; }
        .btn.secondary { background: #3e3e42; }
        .btn.secondary:hover { background: #505050; }
        .filters {
            background: #252526;
            padding: 10px 20px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            gap: 15px;
            font-size: 12px;
        }
        .filter { display: flex; align-items: center; gap: 5px; cursor: pointer; }
        .filter input { cursor: pointer; }
        .logs {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .log-entry {
            padding: 6px 10px;
            border-left: 3px solid transparent;
            margin-bottom: 2px;
            font-size: 13px;
            line-height: 1.5;
        }
        .log-entry:hover { background: #2d2d30; }
        .log-entry.server { border-left-color: #4ec9b0; }
        .log-entry.client { border-left-color: #569cd6; }
        .log-entry.error { background: #5a1d1d; border-left-color: #f48771; }
        .log-entry.warn { background: #5a4d1d; border-left-color: #dcdcaa; }
        .timestamp { color: #858585; margin-right: 8px; }
        .source {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 8px;
        }
        .source.server { background: #4ec9b0; color: #000; }
        .source.client { background: #569cd6; color: #000; }
        .level { 
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-right: 8px;
            font-weight: bold;
        }
        .level.error { background: #f48771; color: #000; }
        .level.warn { background: #dcdcaa; color: #000; }
        .level.log { background: #3e3e42; color: #d4d4d4; }
        .message { color: #d4d4d4; }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #1e1e1e; }
        ::-webkit-scrollbar-thumb { background: #424242; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: #4e4e4e; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Nexus Real-Time Logs</div>
        <div class="controls">
            <button class="btn secondary" onclick="clearLogs()">Clear</button>
            <button class="btn" onclick="toggleAutoScroll()">Auto-scroll: <span id="autoScrollStatus">ON</span></button>
        </div>
    </div>
    <div class="filters">
        <div class="filter"><input type="checkbox" id="filterServer" checked onchange="applyFilters()"> <label for="filterServer">Server</label></div>
        <div class="filter"><input type="checkbox" id="filterClient" checked onchange="applyFilters()"> <label for="filterClient">Client</label></div>
        <div class="filter"><input type="checkbox" id="filterLog" checked onchange="applyFilters()"> <label for="filterLog">Log</label></div>
        <div class="filter"><input type="checkbox" id="filterWarn" checked onchange="applyFilters()"> <label for="filterWarn">Warn</label></div>
        <div class="filter"><input type="checkbox" id="filterError" checked onchange="applyFilters()"> <label for="filterError">Error</label></div>
    </div>
    <div class="logs" id="logs"></div>
    <script>
        let autoScroll = true;
        const logsDiv = document.getElementById('logs');
        const eventSource = new EventSource('/logs/stream');
        
        eventSource.onmessage = (e) => {
            const log = JSON.parse(e.data);
            addLogEntry(log);
        };
        
        function addLogEntry(log) {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = \`log-entry \${log.source} \${log.level}\`;
            entry.dataset.source = log.source;
            entry.dataset.level = log.level;
            entry.innerHTML = \`<span class="timestamp">\${time}</span><span class="source \${log.source}">\${log.source.toUpperCase()}</span><span class="level \${log.level}">\${log.level.toUpperCase()}</span><span class="message">\${escapeHtml(log.message)}</span>\`;
            logsDiv.appendChild(entry);
            if (logsDiv.children.length > 1000) logsDiv.removeChild(logsDiv.firstChild);
            applyFilters();
            if (autoScroll) logsDiv.scrollTop = logsDiv.scrollHeight;
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function clearLogs() {
            logsDiv.innerHTML = '';
        }
        
        function toggleAutoScroll() {
            autoScroll = !autoScroll;
            document.getElementById('autoScrollStatus').textContent = autoScroll ? 'ON' : 'OFF';
        }
        
        function applyFilters() {
            const showServer = document.getElementById('filterServer').checked;
            const showClient = document.getElementById('filterClient').checked;
            const showLog = document.getElementById('filterLog').checked;
            const showWarn = document.getElementById('filterWarn').checked;
            const showError = document.getElementById('filterError').checked;
            
            Array.from(logsDiv.children).forEach(entry => {
                const source = entry.dataset.source;
                const level = entry.dataset.level;
                const sourceMatch = (source === 'server' && showServer) || (source === 'client' && showClient);
                const levelMatch = (level === 'log' && showLog) || (level === 'warn' && showWarn) || (level === 'error' && showError);
                entry.style.display = (sourceMatch && levelMatch) ? 'block' : 'none';
            });
        }
        
        fetch('/logs/history').then(r => r.json()).then(logs => {
            logs.forEach(addLogEntry);
        });
    </script>
</body>
</html>`);
            return;
        }
        
        if (req.url === '/logs/stream') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.writeHead(200);
            
            state.logClients.push(res);

            state.logBuffer.forEach(log => {
                try { res.write(`data: ${JSON.stringify(log)}\n\n`) } catch {}
            });

            req.on('close', () => {
                const idx = state.logClients.indexOf(res);
                if (idx !== -1) state.logClients.splice(idx, 1);
            });
            return;
        }
        
        if (req.url === '/logs/history') {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(state.logBuffer));
            return;
        }
        
        if (req.method === 'POST' && req.url === '/log') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const { level, message } = JSON.parse(body);
                    addLog('client', level, message);
                } catch (e) {}
            });
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (req.method !== 'POST' || req.url !== '/rpc') {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { endpoint: name, args } = JSON.parse(body);
                Logger.logHttpRequest(name, args || [], 'HTTP POST');

                if (!state.endpoints[name]) {
                    Logger.logHttpResponse(name, false, 'Endpoint not found');
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Endpoint not found' }));
                    return;
                }

                try {
                    const result = await Promise.resolve(state.endpoints[name](...(args || [])));
                    Logger.logHttpResponse(name, true, result);
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, result }));
                } catch (endpointError) {
                    const errorMsg = endpointError && endpointError.message ? endpointError.message : String(endpointError);
                    Logger.logHttpResponse(name, false, errorMsg);
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: errorMsg }));
                }
            } catch (e) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.toString() }));
            }
        });
    });
    
    state.server.listen(state.port, '0.0.0.0', () => {
        Logger.logHttpServer(`Server successfully listening on port ${state.port}`);
        console.log(`[HTTP RPC] Server listening on port ${state.port}`);
        console.log(`[HTTP RPC] Logs available at http://localhost:${state.port}/logs`);
    });
}

function getServerHost() {
    if (Context.isServer()) return state.host;
    
    const puerts = require('puerts');
    const UE = require('ue');
    
    try {
        const world = puerts.argv.getByName('world');
        if (world) {
            const netMode = world.GetNetMode();
            if (netMode === UE.ENetMode.NM_Client) {
                const pc = puerts.argv.getByName('playerController');
                if (pc && pc.Player && pc.Player.URL) {
                    const url = pc.Player.URL;
                    if (url.Host && url.Host.length > 0) {
                        const host = url.Host.toString();
                        if (host && host !== '0.0.0.0') {
                            return host;
                        }
                    }
                }
            }
        }
    } catch (e) {
    }
    
    return state.host;
}

async function call(name, ...args) {
    if (state.endpoints[name]) {
        return await Promise.resolve(state.endpoints[name](...args));
    }
    
    const host = getServerHost();
    const url = `http://${host}:${state.port}/rpc`;
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ endpoint: name, args });
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.success) {
                        resolve(response.result);
                    } else {
                        reject(new Error(response.error || 'Unknown error'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.write(postData);
        req.end();
    });
}

function setHost(host) {
    if (typeof host === 'string' && host.length > 0) {
        state.host = host
    }
}

function setPort(port) {
    const p = Number(port)
    if (Number.isInteger(p) && p > 0 && p < 65536) {
        state.port = p
    }
}

interceptConsole();

if (Context.isServer()) {
    startServer();
    console.log('[HTTP RPC] Server module loaded, endpoints object ready');
} else {
    console.log('[HTTP RPC] Client module loaded');
}

module.exports = { endpoint, call, setHost, setPort };

