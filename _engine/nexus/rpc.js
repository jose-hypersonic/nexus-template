const UE = require('ue')
const puerts = require('puerts')
const Context = require('./context')

const endpoints = {}
let bridge = null

function findBridge() {
    const world = puerts.argv.getByName('world')
    if (!world) return null
    
    console.log('[Nexus RPC] findBridge() called, Context:', Context.isServer() ? 'SERVER' : 'CLIENT');
    
    try {
        const localPC = Context.isClient() ? puerts.argv.getByName('playerController') : null
        const actors = UE.NewArray(UE.Actor)
        UE.GameplayStatics.GetAllActorsOfClass(world, UE.Actor.StaticClass(), puerts.$ref(actors))
        
        console.log('[Nexus RPC] Scanning', actors.Num(), 'actors for NexusBridge');

        const wantAuthority = Context.isServer()
        let fallback = null
        let ownedFallback = null
        let bridgeCount = 0;

        for (let i = 0; i < actors.Num(); i++) {
            const a = actors.Get(i)
            if (!a) continue

            const name = a.GetName ? a.GetName() : ''
            if (!name.includes('NexusBridge')) continue
            
            bridgeCount++;
            const hasAuth = a.HasAuthority ? a.HasAuthority() : 'no-fn';
            const owner = a.GetOwner ? a.GetOwner() : null;
            const ownerName = owner ? (owner.GetName ? owner.GetName() : 'unnamed') : 'none';
            console.log(`[Nexus RPC] Bridge #${bridgeCount}:`, name, 'Auth:', hasAuth, 'Owner:', ownerName);

            if (!fallback) fallback = a
            if (localPC && !ownedFallback && a.GetOwner && a.GetOwner() === localPC) {
                ownedFallback = a
            }

            const hasAuthorityFn = a.HasAuthority && typeof a.HasAuthority === 'function'
            if (!hasAuthorityFn) {
                return a
            }

            const isAuthority = a.HasAuthority()
            if (wantAuthority && isAuthority) {
                return a
            }
            if (!wantAuthority && !isAuthority) {
                if (localPC && a.GetOwner && a.GetOwner() === localPC) {
                    return a
                }
                if (localPC && a.SetOwner && !a.GetOwner()) {
                    console.log('[Nexus RPC] Setting bridge owner to local PC:', localPC.GetName());
                    a.SetOwner(localPC);
                    return a;
                }
            }
        }

        if (!bridge) bridge = ownedFallback || fallback
                
        if (bridge && Context.isClient() && localPC && bridge.SetOwner && !bridge.GetOwner()) {
            console.log('[Nexus RPC] Setting selected bridge owner to PC:', localPC.GetName());
            bridge.SetOwner(localPC);
        }
        
        if (bridge) {
            console.log('[Nexus RPC] Selected bridge:', bridge.GetName ? bridge.GetName() : 'unnamed');
            console.log('[Nexus RPC] Final owner:', bridge.GetOwner ? (bridge.GetOwner() ? bridge.GetOwner().GetName() : 'null') : 'no-fn');
        } else {
            console.error('[Nexus RPC] No bridge found!');
        }
        
        return bridge
    } catch (e) {
        console.error('[Nexus RPC] Error with bridge:', e)
        return null
    }
}

function endpoint(name, fn) {
    endpoints[name] = fn
}

function call(name, ...args) {
    if (endpoints[name]) {
        const result = endpoints[name](...args);
        if (result instanceof Promise) {
            return result;
        }
        return Promise.resolve(result);
    }
    
    const b = findBridge()
    if (!b) {
        console.error('[Nexus RPC] Bridge not found, cannot send remote call:', name)
        return Promise.reject(new Error('Bridge not found'));
    }
    
    const message = JSON.stringify({ endpoint: name, args: args })
    const side = Context.isServer() ? 'Server->Client' : 'Client->Server'
    console.log(`[Nexus RPC] ${side} call:`, name)
    console.log(`[Nexus RPC] Bridge:`, b.GetName(), 'HasAuthority:', b.HasAuthority ? b.HasAuthority() : 'unknown')
    console.log(`[Nexus RPC] bReplicates:`, b.bReplicates)
    console.log(`[Nexus RPC] GetNetMode:`, b.GetNetMode ? b.GetNetMode() : 'no-fn')
    console.log(`[Nexus RPC] GetOwner:`, b.GetOwner ? (b.GetOwner() ? b.GetOwner().GetName() : 'null') : 'no-fn')
    
    if (Context.isServer()) {
        console.log(`[Nexus RPC] Calling Client_SendJSMessage with message length:`, message.length)
        try {
        b.Client_SendJSMessage(message)
            console.log(`[Nexus RPC] Client_SendJSMessage returned successfully`)
        } catch (e) {
            console.error(`[Nexus RPC] Client_SendJSMessage threw error:`, e)
        }
    } else {
        console.log(`[Nexus RPC] Calling Server_SendJSMessage with message length:`, message.length)
        try {
        b.Server_SendJSMessage(message)
            console.log(`[Nexus RPC] Server_SendJSMessage returned successfully`)
        } catch (e) {
            console.error(`[Nexus RPC] Server_SendJSMessage threw error:`, e)
        }
    }
    
    return Promise.resolve(undefined);
}

function receive(messageStr) {
    console.log('[Nexus RPC] receive() called, message length:', messageStr ? messageStr.length : 0);
    try {
        const message = JSON.parse(messageStr)
        const { endpoint: name, args } = message
        
        const side = Context.isServer() ? 'Server' : 'Client'
        console.log(`[Nexus RPC] ${side} received:`, name)
        
        if (endpoints[name]) {
            endpoints[name](...args)
        } else {
            console.warn(`[Nexus RPC] Endpoint not found: ${name}`)
        }
    } catch (e) {
        console.error('[Nexus RPC] Failed to process message:', e)
    }
}

module.exports = { endpoint, call, receive }