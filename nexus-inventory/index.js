const db = require('../nexus-essentials/db');

let ui = null;
let isOpen = false;

const MAX_WEIGHT = 100;
const GRID_SLOTS = 32;
const HOTBAR_SLOTS = 5;

function emptyInventory() {
    return { grid: Array(GRID_SLOTS).fill(null), hotbar: Array(HOTBAR_SLOTS).fill(null) };
}

function starterInventory() {
    const inv = emptyInventory();
    inv.grid[0] = { itemId: 'bandage', count: 2 };
    inv.grid[1] = { itemId: 'water_bottle', count: 3 };
    inv.grid[2] = { itemId: 'sandwich', count: 2 };
    inv.grid[3] = { itemId: 'phone', count: 1 };
    inv.grid[4] = { itemId: 'id_card', count: 1 };
    inv.grid[5] = { itemId: 'weapon_knife', count: 1 };
    inv.grid[6] = { itemId: 'lockpick', count: 5 };
    inv.grid[7] = { itemId: 'repairkit', count: 1 };
    return inv;
}

async function getActiveCharacter(helixId) {
    if (!helixId) return null;
    const row = await db.Player.findOne({ where: { helixId: helixId.toString(), active: true } });
    return row ? row.dataValues : null;
}

const itemsDb = require('./items.json');

function getItemDefs() {
    const map = {};
    for (const item of itemsDb) {
        map[item.id] = item;
    }
    return map;
}

function getAllItems() {
    return itemsDb;
}

async function loadInventory(character) {
    if (!character || !character.id) {
        return emptyInventory();
    }
    if (!character.inventory) {
        return starterInventory();
    }
    try {
        const parsed = JSON.parse(character.inventory);
        if (!parsed || !Array.isArray(parsed.grid)) {
            return starterInventory();
        }
        if (parsed.grid.length !== GRID_SLOTS) {
            return starterInventory();
        }
        return parsed;
    } catch (e) {
        return starterInventory();
    }
}

async function saveInventory(characterId, inv) {
    await db.Player.update({ inventory: JSON.stringify(inv) }, { where: { id: characterId } });
}

async function buildPayload(helixId) {
    const character = await getActiveCharacter(helixId);
    if (!character) {
        return { grid: Array(GRID_SLOTS).fill(null), hotbar: Array(HOTBAR_SLOTS).fill(null), maxWeight: MAX_WEIGHT };
    }
    
    const defsMap = getItemDefs();
    const inv = await loadInventory(character);
    
    if (!character.inventory) {
        await saveInventory(character.id, inv);
    }
    
    const grid = inv.grid.map((slot, idx) => {
        if (!slot) return null;
        const def = defsMap[slot.itemId];
        if (!def) {
            return null;
        }
        return { 
            id: def.id,
            name: def.name,
            type: def.type,
            rarity: def.rarity || 'common',
            icon: def.image,
            weight: def.weight,
            desc: def.desc,
            count: slot.count,
            useable: def.useable
        };
    });
    
    return { grid, hotbar: [], maxWeight: MAX_WEIGHT };
}

Nexus.server(async () => {
    await db.connect();

    Nexus.endpoint('inventory:getData', async (helixId) => {
        const payload = await buildPayload(helixId);
        try {
            const testJson = JSON.stringify(payload);
        } catch (e) {
            return { grid: Array(GRID_SLOTS).fill(null), hotbar: Array(HOTBAR_SLOTS).fill(null), maxWeight: MAX_WEIGHT };
        }
        return payload;
    });
    
    Nexus.endpoint('inventory:move', async (helixId, sourceType, sourceIndex, targetType, targetIndex) => {
        if (!helixId || typeof helixId !== 'string') return null;
        if (sourceType !== 'grid' || targetType !== 'grid') return null;
        if (typeof sourceIndex !== 'number' || typeof targetIndex !== 'number') return null;
        if (sourceIndex < 0 || targetIndex < 0) return null;
        if (sourceIndex >= GRID_SLOTS || targetIndex >= GRID_SLOTS) return null;
        
        const character = await getActiveCharacter(helixId);
        if (!character) return null;
        
        const inv = await loadInventory(character);
        
        const tmp = inv.grid[sourceIndex];
        inv.grid[sourceIndex] = inv.grid[targetIndex];
        inv.grid[targetIndex] = tmp;
        
        await saveInventory(character.id, inv);
        return await buildPayload(helixId);
    });
    
    Nexus.endpoint('inventory:drop', async (helixId, slotType, slotIndex) => {
        if (!helixId || typeof helixId !== 'string') return null;
        if (slotType !== 'grid') return null;
        if (typeof slotIndex !== 'number' || slotIndex < 0) return null;
        if (slotIndex >= GRID_SLOTS) return null;
        
        const character = await getActiveCharacter(helixId);
        if (!character) return null;
        
        const inv = await loadInventory(character);
        
        if (!inv.grid[slotIndex]) return null;
        
        inv.grid[slotIndex] = null;
        
        await saveInventory(character.id, inv);
        return await buildPayload(helixId);
    });
    
    Nexus.endpoint('inventory:use', async (helixId, slotType, slotIndex) => {
        if (!helixId || typeof helixId !== 'string') return null;
        if (slotType !== 'grid') return null;
        if (typeof slotIndex !== 'number' || slotIndex < 0) return null;
        if (slotIndex >= GRID_SLOTS) return null;
        
        const character = await getActiveCharacter(helixId);
        if (!character) return null;
        
        const inv = await loadInventory(character);
        const slot = inv.grid[slotIndex];
        
        if (!slot) return null;
        
        const defs = getItemDefs();
        if (!defs[slot.itemId]) {
            return null;
        }
        
        const itemDef = defs[slot.itemId];
        if (!itemDef.useable) {
            return null;
        }
        
        if (slot.count > 1) {
            slot.count -= 1;
        } else {
            inv.grid[slotIndex] = null;
        }
        
        await saveInventory(character.id, inv);
        return await buildPayload(helixId);
    });
});

Nexus.client(() => {
    ui = new WebUI('inventory', 'js/nexus-inventory/web/index.html');
    
    const helixId = () => {
        const id = Player.helixId();
        return id ? id.toString() : null;
    };
    
    ui.RegisterEventHandler('getData', async () => {
        const id = helixId();
        if (!id) return;
        try {
            const data = await Nexus.call('inventory:getData', id);
            if (data) ui.SendEvent('inventoryData', data);
        } catch (e) {
        }
    });
    
    ui.RegisterEventHandler('moveItem', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const result = await Nexus.call('inventory:move', id, data.sourceType, data.sourceIndex, data.targetType, data.targetIndex);
            if (result) ui.SendEvent('inventoryData', result);
        } catch (e) {
        }
    });
    
    ui.RegisterEventHandler('dropItem', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const result = await Nexus.call('inventory:drop', id, data.slotType, data.slotIndex);
            if (result) ui.SendEvent('inventoryData', result);
        } catch (e) {
        }
    });
    
    ui.RegisterEventHandler('useItem', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const result = await Nexus.call('inventory:use', id, data.slotType, data.slotIndex);
            if (result) ui.SendEvent('inventoryData', result);
        } catch (e) {
        }
    });
    
    ui.RegisterEventHandler('close', () => {
        ui.SetInputMode(0);
        ui.SendEvent('hide', {});
        isOpen = false;
    });
    
    ui.SendEvent('hide', {});
    
    Input('Tab', () => {
        if (isOpen) {
            ui.SetInputMode(0);
            ui.SendEvent('hide', {});
            isOpen = false;
        } else {
            const id = helixId();
            if (!id) return;
            ui.BringToFront();
            ui.SetInputMode(1);
            ui.SendEvent('show', {});
            isOpen = true;
        }
    });
});

module.exports = {
    getAllItems,
    async giveItem(targetHelixId, itemId, count) {
        const character = await getActiveCharacter(targetHelixId);
        if (!character) return false;
        
        const defs = getItemDefs();
        if (!defs[itemId]) {
            return false;
        }
        
        const inv = await loadInventory(character);
        
        for (let i = 0; i < GRID_SLOTS; i++) {
            if (!inv.grid[i]) {
                inv.grid[i] = { itemId, count };
                await saveInventory(character.id, inv);
                return true;
            }
        }
        
        return false;
    }
};
