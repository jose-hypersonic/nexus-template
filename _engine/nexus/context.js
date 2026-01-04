const puerts = require('puerts')

const isServer = () => {
    const context = puerts.argv.context

    return context === 'server' || context === 'listen'
}

const isClient = () => {
    const context = puerts.argv.context

    return context === 'client' || context === 'listen'
}

module.exports = { isServer, isClient }