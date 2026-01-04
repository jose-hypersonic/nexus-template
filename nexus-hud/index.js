let ui = null;
let hudActive = false;

Nexus.client(() => {
    ui = new WebUI('nexus_hud', 'js/nexus-hud/web/index.html');
    
    Nexus.on('CharacterSelected', async (character) => {
        if (!character || !ui) return;
        
        hudActive = true;
        const name = `${character.firstName} ${character.lastName}`;
        
        Player.setCharacter(character);
        
        ui.BringToFront();
        ui.SendEvent('show', { name });
        
        updateHUD();
    });
    
    Player.onHealthChanged((oldHealth, newHealth) => {
        if (!hudActive || !ui) return;
        updateHUD();
    });
    
    function updateHUD() {
        if (!hudActive || !ui) return;
        
        const data = Player.data || Player.getCharacter();
        if (!data) return;
        
        ui.SendEvent('updateStats', {
            health: data.health !== undefined ? data.health : 100,
            hunger: data.hunger !== undefined ? data.hunger : 100,
            thirst: data.thirst !== undefined ? data.thirst : 100,
            stress: data.stress !== undefined ? data.stress : 0,
            sickness: data.sickness !== undefined ? data.sickness : 0
        });

        const pc = Player.getController();
        if (pc && pc.GetControlRotation) {
            const rotation = pc.GetControlRotation();
            if (rotation) {
                let yaw = rotation.Yaw || 0;
                while (yaw < 0) yaw += 360;
                while (yaw >= 360) yaw -= 360;
                
                ui.SendEvent('updateCompass', { yaw });
            }
        }
    }

    setInterval(() => {
        updateHUD();
    }, 100);
});
