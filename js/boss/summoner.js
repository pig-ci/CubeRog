const SummonerBoss = {
    initBoss: function(enemy) {
        enemy.vulnerableUntil = 0;
        enemy.lastSummonTime = 0;
        enemy.lastEMPTime = 0;
        enemy.lastBasicAttack = 0;
    },

    initCore: function(enemy, options) {
        enemy.orbitAngle = options.orbitAngle || 0;
        enemy.orbitRadius = 150;
    },

    updateBoss: function(en, player, dt, now, finalMult, timeMult, dx, dy, dist) {
        const idealDist = 400;
        if (dist > idealDist) {
            en.x += (dx / dist) * en.speed * (dt * 60);
            en.y += (dy / dist) * en.speed * (dt * 60);
        } else {
            en.x -= (dx / dist) * en.speed * (dt * 60);
            en.y -= (dy / dist) * en.speed * (dt * 60);
        }

        const currentCores = enemies.filter(e => e.type === 'summonerCore' && e.bossId === en.id);
        if (currentCores.length === 0 && now > en.vulnerableUntil) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                createEnemy('summonerCore', { 
                    bossId: en.id, 
                    orbitAngle: angle,
                    x: en.x + Math.cos(angle) * 150,
                    y: en.y + Math.sin(angle) * 150
                });
            }
        }

        if (now - en.lastSummonTime > 3000) {
            en.lastSummonTime = now;
            for (let i = 0; i < 4; i++) {
                createEnemy('suicideMinion', {
                    x: en.x + (Math.random() - 0.5) * 50,
                    y: en.y + (Math.random() - 0.5) * 50
                });
            }
        }
        
        if (now - en.lastEMPTime > 6000) {
             en.lastEMPTime = now;
             const angle = Math.atan2(dy, dx);
             enemyProjectiles.push({
                 x: en.x, y: en.y,
                 vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
                 type: 'emp_homing', color: '#00BFFF', size: 12, damage: 0,
                 speed: 4,
                 expireTime: now + 5000
             });
        }

        if (now - en.lastBasicAttack > 1500) {
            en.lastBasicAttack = now;
            const angle = Math.atan2(dy, dx);
            enemyProjectiles.push({
                x: en.x, y: en.y,
                vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                type: 'homing',
                color: '#DDA0DD',
                size: 8,
                damage: 10 * finalMult * timeMult,
                speed: 3,
                expireTime: now + 3000
            });
        }
    },

    updateCore: function(en, dt) {
        const boss = enemies.find(e => e.id === en.bossId);
        if (boss) {
            en.orbitAngle += 0.5 * dt;
            en.x = boss.x + Math.cos(en.orbitAngle) * en.orbitRadius;
            en.y = boss.y + Math.sin(en.orbitAngle) * en.orbitRadius;
        } else {
            let index = enemies.findIndex(e => e.id === en.id);
            if (index > -1) enemies.splice(index, 1);
        }
    },

    modifyDamage: function(en, baseDamage, now) {
        let finalDamage = baseDamage;
        const cores = enemies.filter(e => e.type === 'summonerCore' && e.bossId === en.id);
        if (now < en.vulnerableUntil) {
            finalDamage *= 1.5;
        } else if (cores.length > 0) {
            finalDamage *= (1 - cores.length * 0.1);
        }
        return finalDamage;
    },

    onCoreDeath: function(core) {
        const boss = enemies.find(e => e.id === core.bossId);
        if (boss) {
           const remainingCores = enemies.filter(e => e.type === 'summonerCore' && e.bossId === boss.id && e.id !== core.id);
           if (remainingCores.length === 0) {
               boss.vulnerableUntil = Date.now() + 5000;
           }
        }
    }
};