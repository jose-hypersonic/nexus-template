


const puerts = require('puerts');
const { $ref } = require('puerts');

const UE = require('ue');

let healthComp = null;
let cachedCharacter = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3000;

let _pc = null;
let _runtime = null;
let _helixId = null;

function getPlayerController() {
    if (!_pc) {
        _pc = puerts.argv.getByName('playerController');
    }
    return _pc;
}

function getRuntime() {
    if (!_runtime) {
        const world = puerts.argv.getByName('world');
        if (!world) return null;
        
        const GameplayStatics = UE.GameplayStatics;
        const actors = UE.NewArray(UE.Actor);
        GameplayStatics.GetAllActorsWithTag(world, "HJSRuntime", $ref(actors));
        
        if (actors.Num() > 0) {
            _runtime = actors.Get(0);
        }
    }
    return _runtime;
}

function getHelixId() {
    if (_helixId) {
        const str = String(_helixId);
        if (str && str.length > 0 && str !== 'undefined' && str !== 'null') {
            return _helixId;
        }
        _helixId = null;
    }
    
    const pc = getPlayerController();
    if (!pc) return null;
    
    const runtime = getRuntime();
    if (!runtime) return null;
    
    const outId = $ref("");
    runtime.GetHelixId(pc, outId);
    
    const str = String(outId);
    if (str && str.length > 0 && str !== 'undefined' && str !== 'null') {
        _helixId = outId;
        return _helixId;
    }
    
    return null;
}


async function getHealthComponent() {
    if (healthComp) return healthComp;

    for (let i = 0; i < 50; i++) {
        const pc = getPlayerController();
        if (!pc) break;
        const pawn = pc.K2_GetPawn();
        
        if (pawn) {
            const components = pawn.K2_GetComponentsByClass(UE.ActorComponent.StaticClass());
            for (let j = 0; j < components.Num(); j++) {
                const c = components.Get(j);
                const name = c.GetName();
                const className = c.GetClass().GetName();
                
                if (name.includes("HActorHealth") || className.includes("HActorHealth")) {
                    healthComp = c;
                    return c;
                }
            }
        }
        await new Promise(r => setTimeout(r, 200));
    }
    return null;
}

const Player = {
    onHealthChanged: async function(callback) {
        const comp = await getHealthComponent();
        if (comp) {
            comp.OnHealthChanged.Add((Component, Old, New, Instigator, Hit, Tags) => {
                callback(Old, New, { Instigator, Hit, Tags });
            });
        }
    },
    getPawn: () => {
        const pc = getPlayerController();
        return pc ? pc.K2_GetPawn() : null;
    },
    getController: () => getPlayerController(),
    helixId: () => getHelixId(),
    revive: () => {
        const pc = getPlayerController();
        if (pc) {
            UE.HGameplaySystemGlobals.RespawnPlayerByCharacter(pc.K2_GetPawn());
        }
    },
    get data() {
        if (cachedCharacter) return cachedCharacter;
        
        const now = Date.now();
        if ((now - lastFetchTime) < CACHE_DURATION) {
            return cachedCharacter;
        }
        
        const helixId = getHelixId();
        if (!helixId) return null;
        
        try {
            const stored = globalThis.__characterStore[helixId];
            if (stored) {
                cachedCharacter = stored;
                lastFetchTime = now;
            }
        } catch (err) {
            console.error('[Player.data] Error:', err);
        }
        
        return cachedCharacter;
    },
    async fetchData() {
        const helixId = getHelixId();
        if (!helixId) return null;
        
        try {
            const stored = globalThis.__characterStore[helixId];
            if (stored) {
                cachedCharacter = stored;
                lastFetchTime = Date.now();
                return cachedCharacter;
            }
        } catch (err) {
            console.error('[Player.fetchData] Error:', err);
        }
        
        return null;
    },
    get characterId() {
        const data = this.data;
        return data ? data.id : null;
    },
    setCharacter(character) {
        const helixId = getHelixId();
        if (!helixId) return;
        
        try {
            globalThis.__characterStore[helixId] = character;
            cachedCharacter = character;
            lastFetchTime = Date.now();
        } catch (err) {
            console.error('[Player.setCharacter] Error:', err);
        }
    },
    clearCache() {
        cachedCharacter = null;
        lastFetchTime = 0;
    }
};

module.exports = Player;