const handlers = {}

function on(name, fn) {
    if (!handlers[name]) {
        handlers[name] = []
    }
    handlers[name].push(fn)
}

function emit(name, ...args) {
    if (handlers[name]) {
        handlers[name].forEach(fn => fn(...args))
    }
}

module.exports = { on, emit }