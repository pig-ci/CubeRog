function generateRandomEquipment(forcedRarity = null, forcedSlot = null) {
    const slots = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];
    const slot = forcedSlot ? forcedSlot : slots[Math.floor(Math.random() * slots.length)];
    
    let rarity = 'common';
    if (forcedRarity) {
        rarity = forcedRarity;
    } else {
        const r = Math.random();
        if (r < 0.10) rarity = 'rare';        
        else if (r < 0.40) rarity = 'uncommon'; 
    }

    let name = '';
    let stats = { atk: 0, hp: 0, speed: 0 };
    
    const setRoll = Math.random();
    let setType = '';
    if (setRoll < 0.333) setType = 'light';
    else if (setRoll < 0.666) setType = 'tactical';
    else setType = 'basic';

    const mult = rarity === 'rare' ? 2.5 : (rarity === 'uncommon' ? 1.5 : 1.0);
    const fluctuation = 0.75 + (Math.random() * 0.50);
    const finalMult = mult * fluctuation;

    if (slot === 'weapon') { 
        if (setType === 'light') name = '光束槍';
        else if (setType === 'tactical') name = '戰術太刀';
        else name = '鐵製手槍';
        stats.atk = Math.max(1, Math.floor(15 * finalMult)); 
    }
    if (slot === 'helmet') { 
        if (setType === 'light') name = '冷光頭盔';
        else if (setType === 'tactical') name = '戰術頭盔';
        else name = '鐵製頭盔'; 
        stats.hp = Math.max(1, Math.floor(30 * finalMult)); 
    }
    if (slot === 'armor') { 
        if (setType === 'light') name = '光戰甲';
        else if (setType === 'tactical') name = '精鋼戰甲';
        else name = '強化裝甲';
        stats.hp = Math.max(1, Math.floor(50 * finalMult)); 
    }
    if (slot === 'boots') { 
        if (setType === 'light') name = '流光鞋';
        else if (setType === 'tactical') name = '戰術皮靴';
        else name = '推進靴';
        stats.speed = Math.max(0.1, parseFloat((0.3 * finalMult).toFixed(2))); 
    }
    if (slot === 'ring') { 
        if (setType === 'light') name = '光圈';
        else if (setType === 'tactical') name = '青銅戒指';
        else name = '能量戒指';
        stats.atk = Math.max(1, Math.floor(8 * finalMult)); 
        stats.hp = Math.max(1, Math.floor(15 * finalMult)); 
    }
    if (slot === 'amulet') { 
        if (setType === 'light') name = '流光護符';
        else if (setType === 'tactical') name = '精鐵護符';
        else name = '核心護符';
        stats.atk = Math.max(1, Math.floor(12 * finalMult)); 
    }

    const rarityPrefix = rarity === 'rare' ? '稀有 ' : (rarity === 'uncommon' ? '精良 ' : '普通 ');
    
    return {
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        slot: slot,
        rarity: rarity,
        name: rarityPrefix + name,
        baseName: name, 
        stats: stats
    };
}

function createExplosion(x, y, radius, damage) {
    explosions.push({ x: x, y: y, maxRadius: radius, damage: damage, currentRadius: 0, life: 30, hitPlayer: false });
}

startBtn.onclick = () => initGame('normal');

function initGame(mode = 'normal') {
    gameMode = mode; 
    score = 0; level = 1; exp = 0; expToNext = 6;
    totalFrames = 0; eliteSpawnedInCurrentMin = 0; lastElapsedMinute = 0; secondCounter = 0;
    enemyIdCounter = 0; lastTime = 0; runBonusGold = 0; runDrops = [];
    projectiles = []; enemies = []; enemyProjectiles = []; floatingTexts = []; explosions = [];
    encounteredEnemies = new Set(); bossSpawned = false; isPaused = false;
    runUpgrades = baseUpgradePool.map(u => ({ ...u, stars: 0 }));
    bossHpContainer.style.display = 'none';
    bossHpOuter2.style.display = 'none';
    // 強制重置填充寬度，避免顯示舊數據
    bossHpFill.style.width = '0%';
    bossHpFill2.style.width = '0%';
    bossHpFill.style.width = '100%';
    bossHpFill2.style.width = '100%';

    deathScreen.classList.remove('visible');
    deathBanner.style.textShadow = ''; deathBanner.style.color = '';
    
    joystick.active = false; joystick.dx = 0; joystick.dy = 0;
    joystickKnob.style.transform = `translate(-50%, -50%)`;
    
    let equipAtk = 0, equipHp = 0, equipSpeed = 0;
    for (let key in playerEquipment) {
        if (playerEquipment[key]) {
            if (playerEquipment[key].stats.atk) equipAtk += playerEquipment[key].stats.atk;
            if (playerEquipment[key].stats.hp) equipHp += playerEquipment[key].stats.hp;
            if (playerEquipment[key].stats.speed) equipSpeed += playerEquipment[key].stats.speed;
        }
    }

    const bonusAtk = (cubeLevel - 1) * 20;
    const bonusHp = (cubeLevel - 1) * 10;
    const speedMult = Math.pow(1.01, cubeLevel - 1);
    
    player = {
        x: canvas.width / 2, y: canvas.height / 2, size: 28,
        hp: 100 + bonusHp + equipHp, maxHp: 100 + bonusHp + equipHp, 
        speed: (4.8 * speedMult) + equipSpeed, damage: 40 + bonusAtk + equipAtk,
        fireRate: 450, lastShot: 0, bulletCount: 1, bulletSize: 5, bulletSpeed: 12,
        bounces: 0, spread: 0, chainBounce: 0,
        debuffs: { slowFireRateUntil: 0, slowMoveSpeedUntil: 0, blueSlowStacks: 0, blueSlowUntil: 0 }
    };
    
    homeScreen.style.display = 'none'; gameUI.style.display = 'block';
    deathScreen.style.display = 'none'; enemyBanner.style.display = 'none';
    pauseMenu.style.display = 'none'; bossHpContainer.style.display = 'none';
    gameStarted = true; 
    
    if (gameMode === 'sniper_trial' || gameMode === 'octopus_trial' || gameMode === 'summoner_trial' || gameMode === 'twin_trial') {
        levelUpsPending = 5; level = 5; expToNext += (5 * 4);
        showLevelUp(); 
    } else if (gameMode === 'chase_trial') {
        levelUpsPending = 3; level = 3; expToNext += (3 * 2);
        showLevelUp();
    } else {
        gameActive = true; 
    }
    updateStatsUI();
}

function handleEndGame(isWin = false, isSurrender = false) {
    gameStarted = false; gameActive = false; bossHpContainer.style.display = 'none';
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeStr = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    const trialGoldMult = (gameMode === 'normal' && isTrialMode) ? 3 : 1;
    let baseGoldPerMin = ((selectedChapter === 2) ? 1100 : 1000) * trialGoldMult;
    let earnedGold = (elapsedMins * baseGoldPerMin) + runBonusGold; 
    bossHpContainer.style.display = 'none';
    bossHpOuter2.style.display = 'none';
    bossHpFill.style.width = '100%';
    bossHpFill2.style.width = '100%';
    if (isWin) {
        if(gameMode === 'sniper_trial') {
            earnedGold += 2000;
            if (sniperTrialLevel % 5 === 0) runDrops.push(generateRandomEquipment('uncommon'));
            else runDrops.push(generateRandomEquipment('common'));
            sniperTrialLevel++; localStorage.setItem('cubeRPG_sniperTrialLevel', sniperTrialLevel);
        } else if (gameMode === 'octopus_trial') {
            earnedGold += 3000;
            if (Math.random() < 0.3) runDrops.push(generateRandomEquipment('uncommon'));
            else runDrops.push(generateRandomEquipment('common'));
            octopusTrialLevel++; localStorage.setItem('cubeRPG_octopusTrialLevel', octopusTrialLevel);
        } else if (gameMode === 'summoner_trial') {
            earnedGold += 2000;
            const r = Math.random();
            if (r < 0.33) runDrops.push(generateRandomEquipment('common'));
            else if (r < 0.66) runDrops.push(generateRandomEquipment('uncommon'));
            else runDrops.push(generateRandomEquipment('rare'));
            summonerTrialLevel++; localStorage.setItem('cubeRPG_summonerTrialLevel', summonerTrialLevel);
        } else if(gameMode === 'chase_trial') {
            earnedGold += 1500;
            chaseTrialLevel++; localStorage.setItem('cubeRPG_chaseTrialLevel', chaseTrialLevel);
        } else if (gameMode === 'twin_trial') {
            earnedGold += 1000;
            const r = Math.random();
            if (r < 0.95) runDrops.push(generateRandomEquipment('uncommon'));
            else runDrops.push(generateRandomEquipment('rare'));
            twinTrialLevel++; localStorage.setItem('cubeRPG_twinTrialLevel', twinTrialLevel);
        } else {
            earnedGold += 500 * trialGoldMult;
        }

        if (runDrops.length > 0) {
            playerInventory.push(...runDrops);
            localStorage.setItem('cubeRPG_inventory', JSON.stringify(playerInventory));
        }
    }
    
    if (isSurrender) earnedGold = Math.floor(earnedGold * 0.25);

    let currentGold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    localStorage.setItem('cubeRPG_gold', currentGold + earnedGold);

    if (isWin && selectedChapter === 1 && unlockedChapter < 2 && gameMode === 'normal') {
        unlockedChapter = 2; localStorage.setItem('cubeRPG_unlockedChapter', unlockedChapter);
    }
    if (isWin && selectedChapter === 2 && unlockedChapter < 3 && gameMode === 'normal') {
        unlockedChapter = 3; localStorage.setItem('cubeRPG_unlockedChapter', unlockedChapter);
    }

    if (!isSurrender && gameMode === 'normal') {
        if (score > (parseInt(localStorage.getItem('cubeRPG_bestKills') || 0))) localStorage.setItem('cubeRPG_bestKills', score);
        if (elapsedSecs > (parseInt(localStorage.getItem('cubeRPG_bestTime') || 0))) localStorage.setItem('cubeRPG_bestTime', elapsedSecs);
        if (level > (parseInt(localStorage.getItem('cubeRPG_bestLevel') || 1))) localStorage.setItem('cubeRPG_bestLevel', level);
    }
    
    if (isWin) {
        deathBanner.style.display = 'none'; winBanner.style.display = 'flex';
        winBanner.innerText = (gameMode !== 'normal') ? "試煉成功" : "戰役完勝";
    } else {
        deathBanner.style.display = 'flex'; winBanner.style.display = 'none';
        if (isSurrender) deathBanner.innerText = "戰鬥已撤退";
        else deathBanner.innerText = (gameMode !== 'normal') ? "試煉失敗" : "你已死亡";
    }
    
    deathScreen.style.display = 'flex';
    setTimeout(() => { deathScreen.classList.add('visible'); }, 10);
    setTimeout(() => {
        deathScreen.classList.remove('visible');
        setTimeout(() => {
            deathScreen.style.display = 'none'; gameUI.style.display = 'none'; homeScreen.style.display = 'flex';
            deathBanner.style.display = ''; winBanner.style.display = '';
            
            let runStatusText = "";
            if (isSurrender) runStatusText = "【戰鬥撤退】";
            else if (gameMode === 'sniper_trial') runStatusText = isWin ? "【狙擊手試煉成功】" : "【狙擊手試煉失敗】";
            else if (gameMode === 'octopus_trial') runStatusText = isWin ? "【八爪魚試煉成功】" : "【八爪魚試煉失敗】";
            else if (gameMode === 'summoner_trial') runStatusText = isWin ? "【招喚師試煉成功】" : "【招喚師試煉失敗】";
            else if (gameMode === 'chase_trial') runStatusText = isWin ? "【追擊試煉成功】" : "【追擊試煉失敗】";
            else if (gameMode === 'twin_trial') runStatusText = isWin ? "【雙子試煉成功】" : "【雙子試煉失敗】";
            else runStatusText = isWin ? "【戰役完勝】" : "上次戰鬥結算";

            let dropText = isWin && runDrops.length > 0 ? `<br>獲得裝備：${runDrops.map(d => `<span class="rarity-${d.rarity}">${d.name}</span>`).join(', ')}` : '';
            lastRunStats.innerHTML = `${runStatusText}：擊殺 ${score} | 等級 ${level} | 時間 ${timeStr}<br>獲得獎勵：💰 ${earnedGold}${dropText}`;
            
            updateChapterUI(); updateUpgradeUI(); updateBestStats(); updateTrialUI(); updateEquipmentUI(); 
        }, 1000);
    }, 3000);
}

function createEnemy(typeKey, options = {}) {
    const data = enemyTypes[typeKey];
    if (!encounteredEnemies.has(typeKey) && gameMode === 'normal') {
        encounteredEnemies.add(typeKey); showEnemyBanner(typeKey); 
    }

    let x, y; const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = Math.random() * canvas.width; y = -50; } 
    else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height + 50; } 
    else if (side === 2) { x = -50; y = Math.random() * canvas.height; } 
    else { x = canvas.width + 50; y = Math.random() * canvas.height; }
    
    let scaling = 0;
    if (typeKey === 'tank' || typeKey === 'sniperBoss' || typeKey === 'octopusBoss' || typeKey === 'summonerBoss' || typeKey.startsWith('twinBoss')) {
        scaling = level * 50;
    } else {
        scaling = level * 20;
    }
    
    const chapMult = (gameMode === 'normal') ? chapterData[selectedChapter - 1].multiplier : 1;
    const trialMult = (gameMode === 'normal' && isTrialMode) ? 5 : 1;
    let trialLevelMult = 1;
    if (gameMode === 'sniper_trial') trialLevelMult = 1 + (sniperTrialLevel * 0.2);
    if (gameMode === 'octopus_trial') trialLevelMult = 1 + (octopusTrialLevel * 0.2);
    if (gameMode === 'chase_trial') trialLevelMult = 1 + (chaseTrialLevel * 0.2);
    if (gameMode === 'summoner_trial') trialLevelMult = 1 + (summonerTrialLevel * 0.2);
    if (gameMode === 'twin_trial') trialLevelMult = 1 + (twinTrialLevel * 0.2);
    
    const finalMult = chapMult * trialMult * trialLevelMult;
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = (gameMode === 'normal') ? 1 + (0.5 * elapsedMins) : 1;

    let newEnemy = { 
        ...data, id: enemyIdCounter++, type: typeKey, x: x, y: y, 
        currentHp: (data.hp + scaling) * finalMult * timeMult, maxHp: (data.hp + scaling) * finalMult * timeMult,
        damage: data.damage * finalMult * timeMult, exp: (gameMode === 'chase_trial') ? 0 : data.exp, lastAttack: 0,
        ...options
    };

    if (typeKey === 'sniperBoss') SniperBoss.init(newEnemy, options, data);
    else if (typeKey === 'octopusBoss') OctopusBoss.init(newEnemy, options, data);
    else if (typeKey === 'summonerBoss') SummonerBoss.initBoss(newEnemy);
    else if (typeKey === 'summonerCore') SummonerBoss.initCore(newEnemy, options);
    else if (typeKey === 'twinBossRed' || typeKey === 'twinBossBlue') TwinBoss.init(newEnemy, typeKey, data);

    enemies.push(newEnemy);
}

function handleSpawning() {
    if (gameMode !== 'normal') return;
    const elapsedSecs = Math.floor(totalFrames / 60);
    const currentMin = Math.floor(elapsedSecs / 60);
    const currentChapInfo = chapterData[selectedChapter - 1];
    
    if (currentChapInfo.hasBoss && elapsedSecs >= 300 && !bossSpawned) { 
        bossSpawned = true; enemies = []; 
        if (selectedChapter === 1) createEnemy('sniperBoss'); 
        else if (selectedChapter === 2) createEnemy('octopusBoss'); 
        else if (selectedChapter === 3) createEnemy('summonerBoss');
        return; 
    }
    
    if (enemies.some(en => en.type === 'sniperBoss' || en.type === 'octopusBoss' || en.type === 'summonerBoss')) return;

    if (currentMin > lastElapsedMinute) {
        for (let i = 0; i < (3 - eliteSpawnedInCurrentMin); i++) createEnemy('tank');
        eliteSpawnedInCurrentMin = 0; lastElapsedMinute = currentMin;
    }
    
    secondCounter++;
    if (secondCounter >= 60) {
        secondCounter = 0;
        if (Math.random() < 0.05) { createEnemy('tank'); eliteSpawnedInCurrentMin++; }
    }
    
    if (enemies.filter(en => en.type !== 'tank').length < 7) {
        if (Math.random() < 0.7) createEnemy('normal'); else createEnemy('charger');
    }
}

function update(dt) {
    if (!gameActive || !gameStarted || isPaused) return;
    
    const now = Date.now();
    totalFrames++;
    const elapsedSecs = Math.floor(totalFrames / 60);
    timerEl.innerText = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    handleSpawning(); 
    updateStatsUI();
    
    if (gameMode === 'chase_trial' && enemies.length === 0 && gameStarted && score > 0) {
        handleEndGame(true, false); return;
    }
    
    let moveStep = player.speed * (dt * 60);
    if (now < player.debuffs.slowMoveSpeedUntil) moveStep *= 0.5;
    
    if (player.debuffs.blueSlowStacks > 0) {
        if (now > player.debuffs.blueSlowUntil) player.debuffs.blueSlowStacks = 0;
        else moveStep *= (1 - (0.3 * player.debuffs.blueSlowStacks));
    }

    if (joystick.active) {
        player.x += joystick.dx * moveStep;
        player.y += joystick.dy * moveStep;
        player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
        player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
    } else {
        if ((keys['w'] || keys['ArrowUp']) && player.y > player.size / 2) player.y -= moveStep;
        if ((keys['s'] || keys['ArrowDown']) && player.y < canvas.height - player.size / 2) player.y += moveStep;
        if ((keys['a'] || keys['ArrowLeft']) && player.x > player.size / 2) player.x -= moveStep;
        if ((keys['d'] || keys['ArrowRight']) && player.x < canvas.width - player.size / 2) player.x += moveStep;
    }
    
    const fireRateDebuff = (now < player.debuffs.slowFireRateUntil);
    const currentFireRate = fireRateDebuff ? player.fireRate * 5 : player.fireRate;
    
    let validEnemies = enemies.filter(e => !e.isDead);

    if (now - player.lastShot > currentFireRate && validEnemies.length > 0) {
        let closest = null; let minDist = Infinity;
        validEnemies.forEach(en => {
            const d = Math.hypot(en.x - player.x, en.y - player.y);
            if (d < minDist) { minDist = d; closest = en; }
        });
        if (closest) {
            const angle = Math.atan2(closest.y - player.y, closest.x - player.x);
            for(let i = 0; i < player.bulletCount; i++) {
                const multiSpread = (i - (player.bulletCount - 1) / 2) * 0.15;
                const randomSpread = (Math.random() - 0.5) * player.spread;
                projectiles.push({ 
                    x: player.x, y: player.y, 
                    vx: Math.cos(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    vy: Math.sin(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    speed: player.bulletSpeed, size: 5, bounce: player.bounces, chains: player.chainBounce, hitIds: new Set(), toRemove: false
                });
            }
            player.lastShot = now;
        }
    }
    
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        let ep = enemyProjectiles[i];
        if (ep.expireTime && now > ep.expireTime) { enemyProjectiles.splice(i, 1); continue; }

        // 如果是雙子專屬子彈，交給 TwinBoss 處理
        if (TwinBoss.handleProjectile(ep, i, dt, now, player, enemyProjectiles)) {
            continue; 
        }
        
        // 其他原本的主邏輯敵方子彈處理
        if (ep.type === 'homing' || ep.type === 'emp_homing') {
            const dx = player.x - ep.x; const dy = player.y - ep.y; const d = Math.hypot(dx, dy);
            if (ep.vx !== undefined && ep.vy !== undefined) {
                ep.vx += (dx / d) * 0.2 * (dt * 60); ep.vy += (dy / d) * 0.2 * (dt * 60);
                const maxSpeed = ep.speed || 6; const currV = Math.hypot(ep.vx, ep.vy);
                if(currV > maxSpeed) { ep.vx = (ep.vx / currV) * maxSpeed; ep.vy = (ep.vy / currV) * maxSpeed; }
                ep.x += ep.vx * (dt * 60); ep.y += ep.vy * (dt * 60);
            } else {
                const speed = ep.speed || 5; ep.x += (dx / d) * speed * (dt * 60); ep.y += (dy / d) * speed * (dt * 60);
            }
        } else if (ep.type === 'accel') { 
            let accelFactor = Math.pow(1.03, dt * 60); ep.vx *= accelFactor; ep.vy *= accelFactor; 
            ep.x += ep.vx * (dt * 60); ep.y += ep.vy * (dt * 60);
        } else if (ep.type === 's-curve') {
            ep.lifeTime += dt * 8; let amplitude = 40; let forwardSpeed = ep.speed * dt * 60;
            ep.centerX += Math.cos(ep.baseAngle) * forwardSpeed; ep.centerY += Math.sin(ep.baseAngle) * forwardSpeed;
            let orthX = Math.cos(ep.baseAngle + Math.PI/2) * Math.sin(ep.lifeTime) * amplitude;
            let orthY = Math.sin(ep.baseAngle + Math.PI/2) * Math.sin(ep.lifeTime) * amplitude;
            ep.x = ep.centerX + orthX; ep.y = ep.centerY + orthY;
        }

        if (Math.hypot(ep.x - player.x, ep.y - player.y) < player.size / 2 + ep.size) {
            if (ep.type === 'emp_homing') player.debuffs.slowMoveSpeedUntil = now + 3000;
            else player.hp -= ep.damage;
            
            if (ep.isVampiric && ep.bossId !== undefined) {
                let boss = enemies.find(e => e.id === ep.bossId);
                if (boss && !boss.isDead) boss.currentHp = Math.min(boss.maxHp, boss.currentHp + (boss.maxHp * 0.05));
            }
            enemyProjectiles.splice(i, 1);
            if (player.hp <= 0 && gameStarted && ep.type !== 'emp_homing') handleEndGame(false, false); 
            continue;
        }
        
        if (ep.x < -200 || ep.x > canvas.width + 200 || ep.y < -200 || ep.y > canvas.height + 200) enemyProjectiles.splice(i, 1);
    }
    
    for (let pi = projectiles.length - 1; pi >= 0; pi--) {
        let p = projectiles[pi];
        p.x += p.vx * (dt * 60); p.y += p.vy * (dt * 60);
        
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            if (p.bounce > 0) {
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                p.bounce--;
            } else { p.toRemove = true; }
        }

        // 交給 TwinBoss 檢查是否抵消紅彈
        if (TwinBoss.checkBulletInterception(p, enemyProjectiles)) {
            p.toRemove = true;
        }

        if (p.toRemove) { projectiles.splice(pi, 1); continue; }

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            let en = enemies[ei];
            if (en.isDead) continue; 

            if (!p.hitIds.has(en.id) && Math.hypot(p.x - en.x, p.y - en.y) < p.size + en.size / 2) {
                let finalDamage = player.damage;
                if (en.type === 'summonerBoss') finalDamage = SummonerBoss.modifyDamage(en, player.damage, now);
                
                en.currentHp -= finalDamage; p.hitIds.add(en.id);
                if (p.chains > 0) {
                    p.chains--;
                    const nextTargets = enemies.filter(e => !p.hitIds.has(e.id) && e.currentHp > 0 && !e.isDead);
                    if (nextTargets.length > 0) {
                        let target = nextTargets[0]; let mD = Infinity;
                        nextTargets.forEach(nt => { 
                            let d = Math.hypot(p.x - nt.x, p.y - nt.y); 
                            if(d < mD) { mD = d; target = nt; } 
                        });
                        const angle = Math.atan2(target.y - p.y, target.x - p.x);
                        p.vx = Math.cos(angle) * p.speed; p.vy = Math.sin(angle) * p.speed;
                    } else { p.toRemove = true; }
                } else { p.toRemove = true; }
                
                if (en.currentHp <= 0) {
                    if (en.type === 'twinBossRed' || en.type === 'twinBossBlue') {
                        if (!en.isDead) {
                            en.isDead = true; en.currentHp = 0; en.deathTime = now;
                            let partner = enemies.find(e => e.id === en.partnerId);
                            if (partner && partner.isDead) { handleEndGame(true, false); return; }
                        }
                    } else {
                        const isBoss = (en.type === 'sniperBoss' || en.type === 'octopusBoss' || en.type === 'summonerBoss');
                        if (en.type === 'suicideMinion') createExplosion(en.x, en.y, 80, 1000);
                        else if (en.type === 'summonerCore') SummonerBoss.onCoreDeath(en);
                        else { score++; exp += en.exp; }
                         
                        enemies.splice(ei, 1);
                        
                        if (isBoss) { 
                            if (gameMode === 'normal') {
                                if (Math.random() < (isTrialMode ? 0.8 : 0.6)) runDrops.push(generateRandomEquipment());
                            }
                            handleEndGame(true, false); return; 
                        } 
                    }
                }
                break; 
            }
        }
        if (p.toRemove) projectiles.splice(pi, 1);
    }
    
    while (exp >= expToNext) {
        level++; exp -= expToNext; expToNext += 5;
        const availablePool = runUpgrades.filter(u => u.stars < 5);
        if (availablePool.length > 0) { showLevelUp(); return; } 
        else {
            let mins = Math.max(1, Math.floor(elapsedSecs / 60));
            let autoGold = Math.floor(mins * 0.8 * 100) * ((gameMode === 'normal' && isTrialMode) ? 3 : 1);
            runBonusGold += autoGold;
            floatingTexts.push({ x: player.x - 20, y: player.y - 40, text: `+${autoGold} 💰`, life: 90 });
        }
    }
    
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 1 * (dt * 60); floatingTexts[i].life--;   
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
        let exp = explosions[i];
        exp.life--; exp.currentRadius += exp.maxRadius / 30;
        if (!exp.hitPlayer) {
            const dist = Math.hypot(player.x - exp.x, player.y - exp.y);
            if (dist < exp.currentRadius) {
                player.hp -= exp.damage; exp.hitPlayer = true;
                if (player.hp <= 0 && gameStarted) handleEndGame(false, false);
            }
        }
        if (exp.life <= 0) explosions.splice(i, 1);
    }
    
    const chapMult = (gameMode === 'normal') ? chapterData[selectedChapter - 1].multiplier : 1;
    const trialMult = (gameMode === 'normal' && isTrialMode) ? 5 : 1;
    let trialLevelMult = 1;
    if (gameMode === 'sniper_trial') trialLevelMult = 1 + (sniperTrialLevel * 0.2);
    if (gameMode === 'octopus_trial') trialLevelMult = 1 + (octopusTrialLevel * 0.2);
    if (gameMode === 'chase_trial') trialLevelMult = 1 + (chaseTrialLevel * 0.2);
    if (gameMode === 'twin_trial') trialLevelMult = 1 + (twinTrialLevel * 0.2);
    
    const finalMult = chapMult * trialMult * trialLevelMult;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = (gameMode === 'normal') ? 1 + (0.5 * elapsedMins) : 1;
    
    let enemiesToRemoveById = new Set();
    
    TwinBoss.drawLaserAndDamage(ctx, player, dt, finalMult, timeMult);

    enemies.forEach(en => {
        const dx = player.x - en.x; const dy = player.y - en.y; const dist = Math.hypot(dx, dy);
        
        if (en.type === 'sniperBoss') SniperBoss.update(en, player, dt, now, finalMult, timeMult, dx, dy, dist);
        else if (en.type === 'octopusBoss') OctopusBoss.update(en, player, dt, now, finalMult, timeMult, dx, dy, dist);
        else if (en.type === 'summonerBoss') SummonerBoss.updateBoss(en, player, dt, now, finalMult, timeMult, dx, dy, dist);
        else if (en.type === 'summonerCore') SummonerBoss.updateCore(en, dt);
        else if (en.type === 'twinBossRed' || en.type === 'twinBossBlue') TwinBoss.update(en, dt, now, finalMult, timeMult);
        else {
            if (dist > 0 && !en.isDead) {
                const enemyMoveStep = en.speed * (dt * 60);
                en.x += (dx / dist) * enemyMoveStep; en.y += (dy / dist) * enemyMoveStep;
            }
        }
        
        if (!en.isDead) {
            if (en.type === 'suicideMinion') {
                if (dist < player.size / 2 + en.size / 2) { 
                    createExplosion(en.x, en.y, 80, 1000); enemiesToRemoveById.add(en.id);
                }
            } else if (dist < player.size / 2 + en.size / 2) { 
                player.hp -= en.damage * dt; 
                if (player.hp <= 0 && gameStarted) handleEndGame(false, false); 
            }
        }
    });

    if (enemiesToRemoveById.size > 0) enemies = enemies.filter(en => !enemiesToRemoveById.has(en.id));
}

function draw() {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;
    
    explosions.forEach(exp => {
        ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 87, 51, ${(exp.life / 30) * 0.7})`; ctx.fill();
    });

    enemies.forEach(en => { 
        if (en.type === 'octopusBoss') OctopusBoss.draw(en, ctx);
        if (en.type === 'twinBossRed' || en.type === 'twinBossBlue') {
            TwinBoss.draw(en, ctx, Date.now());
            if (en.isDead) return; 
        }
        ctx.fillStyle = en.color; ctx.fillRect(en.x - en.size / 2, en.y - en.size / 2, en.size, en.size); 
    });
    
    let playerColor = '#00d2ff'; const now = Date.now();
    if (now < player.debuffs?.slowFireRateUntil) playerColor = '#87CEEB';
    if (now < player.debuffs?.slowMoveSpeedUntil) playerColor = '#9370DB';
    if (player.debuffs?.blueSlowStacks > 0) playerColor = '#4d4dff';

    ctx.fillStyle = playerColor; ctx.shadowBlur = 10; ctx.shadowColor = playerColor;
    if (player.x) ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
    ctx.shadowBlur = 0;
    
    projectiles.forEach(p => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
    enemyProjectiles.forEach(ep => { ctx.fillStyle = ep.color; ctx.beginPath(); ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2); ctx.fill(); });
    floatingTexts.forEach(ft => { ctx.fillStyle = `rgba(255, 215, 0, ${ft.life / 60})`; ctx.font = 'bold 22px Arial'; ctx.fillText(ft.text, ft.x, ft.y); });
}
