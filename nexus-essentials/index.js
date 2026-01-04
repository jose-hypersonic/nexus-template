const db = require('./db');

let ui = null;
let playerJoined = false;

Nexus.server(async () => {
    await db.connect();
    await db.sync();

    Nexus.endpoint('nexus_essentials:getCharacters', async (helixId) => {
        if (!helixId) return [];
        const existingCharacters = await db.Player.findAll({
            where: { helixId: helixId.toString() },
            order: [['slot', 'ASC']]
        });
        return existingCharacters.map(c => c.dataValues);
    });

    Nexus.endpoint('nexus_essentials:createCharacter', async (helixId, data) => {
        if (!helixId || !data) return [];

        await db.Player.create({
            helixId: helixId.toString(),
            slot: data.slot,
            firstName: data.firstName,
            lastName: data.lastName,
            dob: data.dob,
            country: data.country
        });

        const existingCharacters = await db.Player.findAll({
            where: { helixId: helixId.toString() },
            order: [['slot', 'ASC']]
        });

        return existingCharacters.map(c => c.dataValues);
    });

    Nexus.endpoint('nexus_essentials:deleteCharacter', async (helixId, data) => {
        if (!helixId || !data) return [];

        await db.Player.destroy({
            where: {
                helixId: helixId.toString(),
                slot: data.slot
            }
        });

        const remainingCharacters = await db.Player.findAll({
            where: { helixId: helixId.toString() },
            order: [['slot', 'ASC']]
        });

        return remainingCharacters.map(c => c.dataValues);
    });

    Nexus.endpoint('nexus_essentials:selectCharacter', async (helixId, data) => {
        if (!helixId || !data) return { characters: [], selected: null };

        await db.Player.update(
            { active: false },
            { where: { helixId: helixId.toString() } }
        );

        const character = await db.Player.findOne({
            where: {
                helixId: helixId.toString(),
                slot: data.slot
            }
        });

        if (character) {
            await character.update({ active: true });
            globalThis.__characterStore[helixId.toString()] = character.dataValues;
        }

        const existingCharacters = await db.Player.findAll({
            where: { helixId: helixId.toString() },
            order: [['slot', 'ASC']]
        });

        return {
            characters: existingCharacters.map(c => c.dataValues),
            selected: character ? character.dataValues : null
        };
    });

    Nexus.endpoint('GetActiveCharacter', async () => {
        const helixId = Player.helixId();
        if (!helixId) return null;

        const character = await db.Player.findOne({
            where: {
                helixId: helixId.toString(),
                active: true
            }
        });

        return character ? character.dataValues : null;
    });

    setInterval(async () => {
        try {
            const activeCharacters = await db.Player.findAll({
                where: { active: true }
            });

            for (const char of activeCharacters) {
                let hunger = parseFloat(char.hunger) || 100;
                let thirst = parseFloat(char.thirst) || 100;

                hunger = Math.max(0, hunger - 0.05);
                thirst = Math.max(0, thirst - 0.08);

                await char.update({ hunger, thirst });

                globalThis.__characterStore[char.helixId] = {
                    ...char.dataValues,
                    hunger,
                    thirst
                };
            }
        } catch (e) {
        }
    }, 1000);
});

Nexus.client(() => {
    ui = new WebUI('nexus_essentials', 'js/nexus-essentials/web/index.html');
    
    const helixId = () => {
        const id = Player.helixId()
        return id ? id.toString() : null
    };

    ui.RegisterEventHandler('createCharacter', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const characters = await Nexus.call('nexus_essentials:createCharacter', id, data);
            if (characters && ui) {
                ui.SendEvent('openCharacterSelect', characters);
            }
        } catch (e) {
        }
    });

    ui.RegisterEventHandler('deleteCharacter', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const characters = await Nexus.call('nexus_essentials:deleteCharacter', id, data);
            if (characters && ui) {
                ui.SendEvent('openCharacterSelect', characters);
            }
        } catch (e) {
        }
    });

    ui.RegisterEventHandler('selectCharacter', async (data) => {
        const id = helixId();
        if (!id) return;
        try {
            const result = await Nexus.call('nexus_essentials:selectCharacter', id, data);
            if (result && result.selected) {
                Player.setCharacter(result.selected);
                if (ui) ui.SetInputMode(0);
                Nexus.emit('CharacterSelected', result.selected);
            }
        } catch (e) {
        }
    });

    ui.RegisterEventHandler('removeInput', () => {
        if (ui) ui.SetInputMode(0);
    });
    
    setInterval(async () => {
        if (playerJoined) return;
        const id = helixId();
        if (!id || !Player.getController()) return;
        
        playerJoined = true;
        
        try {
            const characters = await Nexus.call('nexus_essentials:getCharacters', id);
            if (characters && ui) {
                Nexus.emit('MulticharacterReady');
                ui.BringToFront();
                ui.SetInputMode(1);
                ui.SendEvent('openCharacterSelect', characters);
            }
        } catch (e) {
            const errorMsg = e && e.message ? e.message : String(e);
            if (errorMsg.includes('Endpoint not found')) {
                playerJoined = false;
            } else {
                playerJoined = false;
            }
        }
    }, 500);
});
