class Inventory {
    constructor(){
        this.items = {}
    }
    add(item, count=1){
        this.items[item] = (this.items[item]||0)+count
    }
    remove(item, count=1){
        if (!this.items[item]) return
        this.items[item]-=count
        if (this.items[item]<=0) delete this.items[item]
    }
}
module.exports = Inventory