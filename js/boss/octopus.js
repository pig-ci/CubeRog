const OctopusBoss = {
    init: function(enemy, options, data) {
        enemy.phase = 1;
        enemy.isCharging = false;
        enemy.chargeTimer = 0;
        enemy.shockwaveActive = false;
        enemy.shockwaveRadius = 0;
        enemy.shockwaveHitPlayer = false;
        enemy.baseColor = data.color;
    },

    update: function(en, player, dt, now, finalMult, timeMult, dx, dy, dist) {
        if (en.currentHp <= en.maxHp * 0.3) en.phase = Math.max(en.phase || 1, 3);
        else if (en.currentHp <= en.maxHp * 0.6) en.phase = Math.max(en.phase || 1, 2);

        if (en.isCharging) {
            en.chargeTimer -= dt;
            en.color = '#00ff00'; 
            
            if (en.chargeTimer <= 0) {
                en.isCharging = false;
                en.shockwaveActive = true;
                en.shockwaveRadius = 0;
                en.shockwaveHitPlayer = false;
            }
        } else {
            if (dist > 250) {
                en.x += (dx / dist) * en.speed * (dt * 60); 
                en.y += (dy / dist) * en.speed * (dt * 60);
            } else if (dist < 150) {
                en.x -= (dx / dist) * en.speed * (dt * 60); 
                en.y -= (dy / dist) * en.speed * (dt * 60);
            }

            if (en.phase >= 3) {
                en.color = '#008000'; 
            } else {
                en.color = en.baseColor;
            }

            if (now - en.lastAttack > 2000) {
                en.lastAttack = now;
                let bulletColor = en.phase >= 3 ? '#00ff00' : '#ff00ff';
                let isVampiric = en.phase >= 3;
                
                let angleOffset = Math.random() * Math.PI; 
                for(let i = 0; i < 8; i++) {
                    let angle = angleOffset + (i * Math.PI / 4);
                    enemyProjectiles.push({
                        x: en.x, y: en.y,
                        centerX: en.x, centerY: en.y, 
                        baseAngle: angle,
                        speed: 3 + (timeMult * 0.5),
                        type: 's-curve',
                        lifeTime: 0,
                        color: bulletColor,
                        size: 10,
                        damage: 30 * finalMult * timeMult,
                        isVampiric: isVampiric,
                        bossId: en.id
                    });
                }
            }

            if (en.phase >= 2 && !en.shockwaveActive && Math.random() < 0.005) {
                en.isCharging = true;
                en.chargeTimer = 1.5; 
            }
        }

        if (en.shockwaveActive) {
            en.shockwaveRadius += 600 * dt; 
            if (en.shockwaveRadius > 450) {
                en.shockwaveActive = false; 
            }
            
            if (!en.shockwaveHitPlayer && dist < en.shockwaveRadius && dist > en.shockwaveRadius - 40) {
                en.shockwaveHitPlayer = true;
                
                let kbAngle = Math.atan2(player.y - en.y, player.x - en.x);
                
                player.x += Math.cos(kbAngle) * 150 * (dt * 60); 
                player.y += Math.sin(kbAngle) * 150 * (dt * 60);
                
                player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
                player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
                
                player.hp -= 40 * finalMult * timeMult * (dt * 60);

                let activeBullets = enemyProjectiles.filter(ep => ep.type === 's-curve');
                activeBullets.sort((a,b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
                
                activeBullets.slice(0, 4).forEach(ep => {
                    ep.type = 'homing';
                    ep.color = '#ff0000'; 
                    ep.vx = Math.cos(ep.baseAngle) * 4; 
                    ep.vy = Math.sin(ep.baseAngle) * 4;
                });
            }
        }
    },

    draw: function(en, ctx) {
        if (en.shockwaveActive) {
            ctx.beginPath();
            ctx.arc(en.x, en.y, en.shockwaveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 0, ${Math.max(0, 1 - (en.shockwaveRadius / 450))})`; 
            ctx.lineWidth = 15;
            ctx.stroke();
        }
    }
};