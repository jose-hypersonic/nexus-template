const UE = require('ue')
const puerts = require('puerts')
const { $ref } = puerts
const Logger = require('./logger')

class WebUI {
    constructor(name, path, inputMode = 0) {
        Logger.logWebUI('CREATE', name, `Path: ${path}, InputMode: ${inputMode}`);
        this.Name = name
        this.Events = {}
        this.Widget = null
        this.Host = null

        this.GWorld = puerts.argv.getByName("world")
        this._findHostAndInit(path, inputMode)
    }

    _findHostAndInit(path, inputMode) {
        const GameplayStatics = UE.GameplayStatics
        const actors = UE.NewArray(UE.Actor)

        GameplayStatics.GetAllActorsWithTag(this.GWorld, "HWebUI", $ref(actors))
        const host = actors.Get(0)
        if (!host) return

        this.Host = host
        this.Widget = host.CreateWidget(path, '')
        this.SetInputMode(inputMode)

        this.Widget.OnEventReceive_v2.Add((widget, eventName, data, callback) => {
            const handler = this.Events[eventName.toLowerCase()]
            if (!handler) return

            const jsonStr = UE.JsonLibraryHelpers.JsonValue_Stringify(data, true)
            const parsed = JSON.parse(jsonStr)

            const callbackHandler = (...args) => {
                const stringified = JSON.stringify(args)
                const json = UE.JsonLibraryHelpers.Parse(stringified, false, true)
                if (widget) widget.InvokeCallback(callback, json)
            }

            handler(parsed, callbackHandler)
        })
    }

    SendEvent(name, payload = {}) {
        if (!this.Widget) return
        Logger.logWebUI('SEND_EVENT', this.Name, `Event: ${name}`);
        const stringified = JSON.stringify(payload)
        const json = UE.JsonLibraryHelpers.Parse(stringified, false, true)
        this.Widget.SendEvent(name, json)
    }

    RegisterEventHandler(name, fn) {
        Logger.logWebUI('REGISTER_HANDLER', this.Name, `Event: ${name}`);
        this.Events[name.toLowerCase()] = fn
    }

    BringToFront() {
        if (this.Host && this.Widget) this.Host.BringToFront(this.Widget)
    }

    SetInputMode(mode) {
        if (this.Host) this.Host.SetInputMode(mode | 0)
    }

    Destroy() {
        if (this.Widget && this.Host) {
            this.Host.DestroyWidget(this.Widget)
            this.Widget = null
        }
    }
}

module.exports = WebUI
