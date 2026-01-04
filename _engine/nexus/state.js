const state = {}
function set(key,val){ state[key]=val }
function get(key){ return state[key] }
module.exports = { set, get }