


const puerts = require('puerts');
const { $ref } = require('puerts');

const UE = require('ue');
const State = require('../state/state');

const pc = puerts.argv.getByName('playerController');

let healthComp = null;

const GameplayStatics = UE.GameplayStatics
const actors = UE.NewArray(UE.Actor)

GameplayStatics.GetAllActorsWithTag(puerts.argv.getByName("world"), "HJSRuntime", $ref(actors))
const runtime = actors.Get(0)

var helixId = null;

if (runtime) {
    const outId = $ref("");              
    runtime.GetHelixId(pc, outId);
    helixId = outId;
}


async function getHealthComponent() {
    if (healthComp) return healthComp;

    for (let i = 0; i < 50; i++) {
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
    getPawn: () => pc ? pc.K2_GetPawn() : null,
    getController: () => pc,
    helixId: () => helixId,
    revive: () => UE.HGameplaySystemGlobals.RespawnPlayerByCharacter(pc.K2_GetPawn()),
    get data() {
        return State.get('activeCharacter');
    },
    get characterId() {
        return State.get('activeCharacterId');
    }
};

module.exports = Player;