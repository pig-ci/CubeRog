const TwinBoss = {
    init: function(enemy, type, data) {
        enemy.color = type === 'twinBossRed' ? '#ff4d4d' : '#4d4dff';
        enemy.twinType = type;
        enemy.isDead = false;
        enemy.deathTime = 0;
        enemy.partnerId = null; 
        
        // 強制覆寫初始生成座標，防止從螢幕邊緣生成導致開場飛越螢幕的「瞬移」感
        enemy.x = type === 'twinBossRed' ? canvas.width * 0.2 : canvas.width * 0.8;
        enemy.y = canvas.height * 0.5;
        
        enemy.angleY = Math.random() * Math.PI * 2;
    },

    update: function(en, dt, now, finalMult, timeMult) {
        if (en.isDead) {
            if (now - en.deathTime > 15000) {
                let partner = enemies.find(e => e.id === en.partnerId);
                if (partner && !partner.isDead) {
                    en.isDead = false;
                    en.currentHp = en.maxHp * 0.25; 
                    en.deathTime = 0;
                    floatingTexts.push({ x: en.x, y: en.y - 40, text: "雙子共鳴：復活!", life: 90 });
                }
            }
            return;
        }

        en.angleY += dt;
        let idealY = canvas.height * 0.5 + Math.sin(en.angleY) * 200;
        let idealX = en.twinType === 'twinBossRed' ? canvas.width * 0.2 : canvas.width * 0.8;

        // 平滑向目標位置移動
        en.x += (idealX - en.x) * dt * 2;
        en.y += (idealY - en.y) * dt * 2;

        if (now - en.lastAttack > 2000) {
            en.lastAttack = now;
            const angleToPlayer = Math.atan2(player.y - en.y, player.x - en.x);
            const bulletCount = 6;
            const spreadAngle = (70 * Math.PI) / 180;
            const startAngle = angleToPlayer - spreadAngle / 2;
            const angleStep = spreadAngle / (bulletCount - 1);

            for (let i = 0; i < bulletCount; i++) {
                const angle = startAngle + i * angleStep;
                if (en.twinType === 'twinBossRed') {
                    enemyProjectiles.push({
                        id: Math.random(),
                        x: en.x, y: en.y,
                        vx: Math.cos(angle) * 2.5, vy: Math.sin(angle) * 2.5,
                        type: 'destructible_homing', color: '#ff4d4d', size: 8,
                        damage: 30 * finalMult * timeMult,
                        speed: 2.5,
                        homingUntil: now + 3000, 
                        bossId: en.id,
                        isVampiric: true
                    });
                } else {
                    enemyProjectiles.push({
                        x: en.x, y: en.y,
                        vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                        type: 'blue_slow', color: '#4d4dff', size: 8,
                        damage: 30 * finalMult * timeMult,
                        speed: 3
                    });
                }
            }
        }
    },

    // 處理雙子專屬子彈的移動與碰撞
    handleProjectile: function(ep, index, dt, now, player, enemyProjectiles) {
        if (ep.type === 'destructible_homing') {
            if (ep.homingUntil && now > ep.homingUntil) {
                ep.x += ep.vx * (dt * 60);
                ep.y += ep.vy * (dt * 60);
            } else {
                const dx = player.x - ep.x;
                const dy = player.y - ep.y;
                const d = Math.hypot(dx, dy);
                ep.vx += (dx / d) * 0.2 * (dt * 60);
                ep.vy += (dy / d) * 0.2 * (dt * 60);
                const currV = Math.hypot(ep.vx, ep.vy);
                if (currV > ep.speed) { 
                    ep.vx = (ep.vx / currV) * ep.speed; 
                    ep.vy = (ep.vy / currV) * ep.speed; 
                }
                ep.x += ep.vx * (dt * 60);
                ep.y += ep.vy * (dt * 60);
            }
        } else if (ep.type === 'blue_slow') {
            ep.x += ep.vx * (dt * 60);
            ep.y += ep.vy * (dt * 60);
        } else {
            return false; // 不是雙子的子彈，交給主邏輯處理
        }

        // 碰撞判定
        if (Math.hypot(ep.x - player.x, ep.y - player.y) < player.size / 2 + ep.size) {
            if (ep.type === 'blue_slow') {
                player.hp -= ep.damage;
                if (now > player.debuffs.blueSlowUntil) player.debuffs.blueSlowStacks = 0;
                player.debuffs.blueSlowStacks = Math.min((player.debuffs.blueSlowStacks || 0) + 1, 3);
                player.debuffs.blueSlowUntil = now + 1000;
            } else if (ep.type === 'destructible_homing') {
                player.hp -= ep.damage;
                if (ep.isVampiric && ep.bossId !== undefined) {
                    let boss = enemies.find(e => e.id === ep.bossId);
                    if (boss && !boss.isDead) {
                        boss.currentHp = Math.min(boss.maxHp, boss.currentHp + (boss.maxHp * 0.005));
                    }
                }
            }
            
            enemyProjectiles.splice(index, 1);
            if (player.hp <= 0 && gameStarted) {
                handleEndGame(false, false);
            }
            return true;
        }

        // 邊界消除
        if (ep.x < -200 || ep.x > canvas.width + 200 || ep.y < -200 || ep.y > canvas.height + 200) {
            enemyProjectiles.splice(index, 1);
        }

        return true; // 雙子子彈處理完畢
    },

    // 檢查玩家子彈是否抵消紅色追蹤彈
    checkBulletInterception: function(p, enemyProjectiles) {
        for (let ei = enemyProjectiles.length - 1; ei >= 0; ei--) {
            let ep = enemyProjectiles[ei];
            if (ep.type === 'destructible_homing') {
                if (Math.hypot(p.x - ep.x, p.y - ep.y) < p.size + ep.size) {
                    enemyProjectiles.splice(ei, 1);
                    return true; // 成功抵消
                }
            }
        }
        return false;
    },

    draw: function(en, ctx, now) {
        if (en.isDead) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.fillRect(en.x - en.size / 2, en.y - en.size / 2, en.size, en.size);
            
            let timeLeft = Math.max(0, 15 - (now - en.deathTime) / 1000).toFixed(1);
            ctx.fillStyle = '#ff4d4d';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(timeLeft + "s", en.x - 15, en.y - en.size);
            return;
        }
    },

    drawLaserAndDamage: function(ctx, player, dt, finalMult, timeMult) {
        let redTwin = enemies.find(e => e.type === 'twinBossRed' && !e.isDead);
        let blueTwin = enemies.find(e => e.type === 'twinBossBlue' && !e.isDead);
        
        if (!redTwin || !blueTwin) return;

        ctx.beginPath();
        ctx.moveTo(redTwin.x, redTwin.y);
        ctx.lineTo(blueTwin.x, blueTwin.y);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        ctx.stroke();
        ctx.shadowBlur = 0;

        let px = player.x, py = player.y;
        let x1 = redTwin.x, y1 = redTwin.y;
        let x2 = blueTwin.x, y2 = blueTwin.y;

        let A = px - x1;
        let B = py - y1;
        let C = x2 - x1;
        let D = y2 - y1;

        let dot = A * C + B * D;
        let len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }

        let dx = px - xx;
        let dy = py - yy;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.size / 2 + 6) { 
            player.hp -= (30 * finalMult * timeMult) * dt;
        }
    }
};