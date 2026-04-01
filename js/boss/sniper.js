const SniperBoss = {
    init: function(enemy, options, data) {
        // Sniper Boss 在初始化時不需要額外的屬性
    },
    
    update: function(en, player, dt, now, finalMult, timeMult, dx, dy, dist) {
        const idealDist = 350; 
        const bossMoveStep = en.speed * (dt * 60);
        
        if (dist > idealDist + 50) { 
            en.x += (dx / dist) * bossMoveStep; 
            en.y += (dy / dist) * bossMoveStep; 
        } else if (dist < idealDist - 50) { 
            en.x -= (dx / dist) * bossMoveStep; 
            en.y -= (dy / dist) * bossMoveStep; 
        }
        
        if (now - en.lastAttack > 2500) {
            en.lastAttack = now; 
            const angle = Math.atan2(dy, dx);
            enemyProjectiles.push({ 
                x: en.x, y: en.y, 
                vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, 
                type: 'homing', color: '#ff4d4d', size: 8, damage: 25 * finalMult * timeMult
            });
            for(let i = 0; i < 4; i++) {
                const sAngle = angle + (i - 1.5) * 0.4;
                enemyProjectiles.push({ 
                    x: en.x, y: en.y, 
                    vx: Math.cos(sAngle) * 1.5, vy: Math.sin(sAngle) * 1.5, 
                    type: 'accel', color: '#ffff00', size: 10, damage: 40 * finalMult * timeMult
                });
            }
        }
    }
};