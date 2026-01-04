const Context = require('./context')
const Events = require('./events')
const HttpRPC = require('./http-rpc')
const Player = require('./player')
const Inventory = require('./inventory')
const State = require('./state')
const Logger = require('./logger')

const Nexus = {
    client(fn) {
        Logger.logApiCall('Nexus', 'client', [fn]);
        if (Context.isClient()) fn();
    },
    
    server(fn) {
        Logger.logApiCall('Nexus', 'server', [fn]);
        if (Context.isServer()) fn();
    },
    
    on(eventName, callback) {
        Logger.logEvent(eventName, 'LISTEN', null);
        return Events.on(eventName, callback);
    },
    
    emit(eventName, data) {
        Logger.logEvent(eventName, 'EMIT', data);
        return Events.emit(eventName, data);
    },
    
    endpoint(name, handler) {
        Logger.logEndpoint(name, true);
        return HttpRPC.endpoint(name, handler);
    },
    
    call(name, ...args) {
        Logger.logEndpoint(name, false);
        Logger.logHttpRequest(name, args, 'Nexus.call');
        return HttpRPC.call(name, ...args);
    },
    
    Player,
    Inventory,
    State,
    
    playerJoined(callback) {
        Logger.logApiCall('Nexus', 'playerJoined', [callback]);
        if (Context.isServer()) {
            Events.on('PlayerJoined:Server', callback);
        }
        if (Context.isClient()) {
            Events.on('PlayerJoined:Client', callback);
        }
    }
}

module.exports = Nexus