const fs = require('fs');
const path = require('path');
const Context = require('./context');

const logFilePath = path.join(__dirname, '..', 'Nexus.log');
let logStream = null;
let initAttempted = false;

function ensureLogStream() {
    if (!logStream && !initAttempted) {
        initAttempted = true;
        try {
            logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
            logToFile('='.repeat(80));
            logToFile(`[NEXUS] Log session started at ${new Date().toISOString()}`);
            logToFile(`[NEXUS] Context: ${Context.isServer() ? 'SERVER' : 'CLIENT'}`);
            logToFile('='.repeat(80));
        } catch (e) {
            console.error('[Nexus Logger] Failed to create log file:', e);
        }
    }
    return logStream;
}

function logToFile(message) {
    const stream = ensureLogStream();
    if (stream) {
        const timestamp = new Date().toISOString();
        stream.write(`[${timestamp}] ${message}\n`);
    }
}

function getStackTrace() {
    try {
        const stack = new Error().stack;
        const lines = stack.split('\n');
        const relevantLines = lines.slice(3, 6).map(line => {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
            if (match) return `${match[1]}@${match[2]}:${match[3]}`;
            return line.trim();
        });
        return relevantLines.join(' <- ');
    } catch {
        return '[stack trace unavailable]';
    }
}

function formatArgs(args) {
    try {
        return args.map(a => {
            if (typeof a === 'function') return '[Function]';
            if (typeof a === 'undefined') return 'undefined';
            if (a === null) return 'null';
            if (typeof a === 'object') {
                try { 
                    const str = JSON.stringify(a);
                    return str.length > 100 ? str.substring(0, 100) + '...' : str;
                } catch { 
                    return '[Object]'; 
                }
            }
            return String(a);
        }).join(', ');
    } catch {
        return '[error formatting args]';
    }
}

function logApiCall(apiName, method, args) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    const argsStr = formatArgs(args || []);
    const stack = getStackTrace();
    logToFile(`\n[${contextStr}] [API:${apiName}.${method}] Args: (${argsStr})\n    Stack: ${stack}`);
}

function logEndpoint(name, isRegistration) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    const action = isRegistration ? 'REGISTERED' : 'CALLED';
    const stack = getStackTrace();
    logToFile(`\n[${contextStr}] [ENDPOINT:${action}] ${name}\n    Stack: ${stack}`);
}

function logEvent(eventName, action, data) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    let dataStr = '';
    if (data) {
        try {
            const str = JSON.stringify(data);
            dataStr = ` | Data: ${str.length > 100 ? str.substring(0, 100) + '...' : str}`;
        } catch {
            dataStr = ' | Data: [unable to serialize]';
        }
    }
    const stack = getStackTrace();
    logToFile(`\n[${contextStr}] [EVENT:${action}] ${eventName}${dataStr}\n    Stack: ${stack}`);
}

function logHttpServer(message) {
    const stack = getStackTrace();
    logToFile(`[SERVER] [HTTP] ${message}\n    Stack: ${stack}`);
}

function logHttpRequest(endpoint, args, source) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    const argsStr = formatArgs(args || []);
    logToFile(`[${contextStr}] [HTTP:REQUEST] Endpoint: ${endpoint} | Args: (${argsStr}) | Source: ${source}`);
}

function logHttpResponse(endpoint, success, result) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    let resultStr = '';
    if (success) {
        try {
            const str = JSON.stringify(result);
            resultStr = `Success: ${str.length > 200 ? str.substring(0, 200) + '...' : str}`;
        } catch {
            resultStr = 'Success: [unable to serialize]';
        }
    } else {
        resultStr = `Error: ${result}`;
    }
    logToFile(`[${contextStr}] [HTTP:RESPONSE] Endpoint: ${endpoint} | ${resultStr}`);
}

function logGeneral(category, message) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    logToFile(`[${contextStr}] [${category}] ${message}`);
}

function logWebUI(action, name, details) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    const stack = getStackTrace();
    logToFile(`\n[${contextStr}] [WEBUI:${action}] ${name} ${details || ''}\n    Stack: ${stack}`);
}

function logInput(key, action) {
    const contextStr = Context.isServer() ? 'SERVER' : 'CLIENT';
    const stack = getStackTrace();
    logToFile(`\n[${contextStr}] [INPUT:${action}] Key: ${key}\n    Stack: ${stack}`);
}

module.exports = {
    logApiCall,
    logEndpoint,
    logEvent,
    logHttpServer,
    logHttpRequest,
    logHttpResponse,
    logGeneral,
    logWebUI,
    logInput,
    logToFile
};

