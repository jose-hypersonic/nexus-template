const UE = require('ue')
const puerts = require('puerts')
const { $ref } = puerts
const Logger = require('./logger')

const GameplayStatics = UE.GameplayStatics

const GWorld = puerts.argv.getByName("world")

let dispatcher = null
let initialized = false
const bindings = {}

function tryInit() {
    if (initialized) return
    if (!GWorld) return

    const actors = UE.NewArray(UE.Actor)
    GameplayStatics.GetAllActorsWithTag(GWorld, "HInputDispatcher", $ref(actors))
    dispatcher = actors.Get(0)

    if (!dispatcher) return

    initialized = true

    dispatcher.OnKeyPressed.Add((key) => {
        const name = key.KeyName
        Logger.logInput(name, 'PRESSED');
        const callbacks = bindings[name]
        if (!callbacks) return

        for (const cb of callbacks) {
            try {
                cb()
            } catch (e) {
                console.error(`[Input] Callback failed for key ${name}`, e)
            }
        }
    })
}

function Input(key, callback) {
    Logger.logInput(key, 'BIND');
    if (!bindings[key]) {
        bindings[key] = []
    }

    bindings[key].push(callback)
    tryInit()
}

module.exports = Input
