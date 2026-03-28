function generateRandomEquipment(forcedRarity = null, forcedSlot = null) {
    const slots = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];
    const slot = forcedSlot ? forcedSlot : slots[Math.floor(Math.random() * slots.length)];
    
    // 稀有度分配：10% 稀有(藍), 30% 精良(綠), 60% 普通(灰)
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
    
    // 決定要掉落哪一套裝備 (各 33.33% 機率)
    const setRoll = Math.random();
    let setType = '';
    if (setRoll < 0.333) setType = 'light';
    else if (setRoll < 0.666) setType = 'tactical';
    else setType = 'basic';

    // 稀有度倍率
    const mult = rarity === 'rare' ? 2.5 : (rarity === 'uncommon' ? 1.5 : 1.0);
    
    // 屬性波動：給予基準數值 ±25% 的隨機浮動幅度 (0.75 ~ 1.25)
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

startBtn.onclick = () => initGame('normal');
function initGame(mode = 'normal') {
    gameMode = mode; 
    score = 0; 
    level = 1; 
    exp = 0; 
    expToNext = 6;
    totalFrames = 0; 
    eliteSpawnedInCurrentMin = 0; 
    lastElapsedMinute = 0; 
    secondCounter = 0;
    enemyIdCounter = 0; 
    lastTime = 0; 
    runBonusGold = 0;
    runDrops = [];
    projectiles = []; 
    enemies = []; 
    enemyProjectiles = []; 
    floatingTexts = [];
    encounteredEnemies = new Set(); 
    bossSpawned = false; 
    isPaused = false;
    runUpgrades = baseUpgradePool.map(u => {
        return { ...u, stars: 0 };
    });
    deathScreen.classList.remove('visible');
    deathBanner.style.textShadow = ''; 
    deathBanner.style.color = '';
    
    // 計算裝備加成
    let equipAtk = 0;
    let equipHp = 0;
    let equipSpeed = 0;
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
        x: canvas.width / 2, 
        y: canvas.height / 2, 
        size: 28,
        hp: 100 + bonusHp + equipHp, 
        maxHp: 100 + bonusHp + equipHp, 
        speed: (4.8 * speedMult) + equipSpeed, 
        damage: 40 + bonusAtk + equipAtk,
        fireRate: 450, 
        lastShot: 0, 
        bulletCount: 1, 
        bulletSize: 5, 
        bulletSpeed: 12,
        bounces: 0, 
        spread: 0, 
        chainBounce: 0
    };
    
    homeScreen.style.display = 'none'; 
    gameUI.style.display = 'block';
    deathScreen.style.display = 'none'; 
    enemyBanner.style.display = 'none';
    pauseMenu.style.display = 'none'; 
    bossHpContainer.style.display = 'none';
    gameStarted = true; 
    
    if (gameMode === 'sniper_trial' || gameMode === 'octopus_trial') {
        levelUpsPending = 5;
        level = 5;
        expToNext += (5 * 4);
        showLevelUp(); 
    } else if (gameMode === 'chase_trial') {
        levelUpsPending = 3;
        level = 3;
        expToNext += (3 * 2);
        showLevelUp();
    } else {
        gameActive = true; 
    }
    updateStatsUI();
}

function handleEndGame(isWin = false, isSurrender = false) {
    gameStarted = false; 
    gameActive = false; 
    bossHpContainer.style.display = 'none';
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeStr = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    const trialGoldMult = (gameMode === 'normal' && isTrialMode) ? 3 : 1;
    let baseGoldPerMin = ((selectedChapter === 2) ? 1100 : 1000) * trialGoldMult;
    let earnedGold = (elapsedMins * baseGoldPerMin) + runBonusGold; 
    
    if (isWin) {
        if(gameMode === 'sniper_trial') {
            earnedGold += 2000;
            if (sniperTrialLevel % 5 === 0) {
                runDrops.push(generateRandomEquipment('uncommon'));
            } else {
                runDrops.push(generateRandomEquipment('common'));
            }
            sniperTrialLevel++;
            localStorage.setItem('cubeRPG_sniperTrialLevel', sniperTrialLevel);

        } else if (gameMode === 'octopus_trial') {
            earnedGold += 3000;
            if (Math.random() < 0.3) {
                runDrops.push(generateRandomEquipment('uncommon'));
            } else {
                runDrops.push(generateRandomEquipment('common'));
            }
            octopusTrialLevel++;
            localStorage.setItem('cubeRPG_octopusTrialLevel', octopusTrialLevel);

        } else if(gameMode === 'chase_trial') {
            earnedGold += 1500;
            chaseTrialLevel++;
            localStorage.setItem('cubeRPG_chaseTrialLevel', chaseTrialLevel);
        } else {
            earnedGold += 500 * trialGoldMult;
        }

        if (runDrops.length > 0) {
            playerInventory.push(...runDrops);
            localStorage.setItem('cubeRPG_inventory', JSON.stringify(playerInventory));
        }
    }
    
    if (isSurrender) {
        earnedGold = Math.floor(earnedGold * 0.25);
    }

    let currentGold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    localStorage.setItem('cubeRPG_gold', currentGold + earnedGold);

    if (isWin && selectedChapter === 1 && unlockedChapter < 2 && gameMode === 'normal') {
        unlockedChapter = 2; 
        localStorage.setItem('cubeRPG_unlockedChapter', unlockedChapter);
    }

    if (!isSurrender && gameMode === 'normal') {
        if (score > (parseInt(localStorage.getItem('cubeRPG_bestKills') || 0))) {
            localStorage.setItem('cubeRPG_bestKills', score);
        }
        if (elapsedSecs > (parseInt(localStorage.getItem('cubeRPG_bestTime') || 0))) {
            localStorage.setItem('cubeRPG_bestTime', elapsedSecs);
        }
        if (level > (parseInt(localStorage.getItem('cubeRPG_bestLevel') || 1))) {
            localStorage.setItem('cubeRPG_bestLevel', level);
        }
    }
    
    if (isWin) {
        deathBanner.style.display = 'none'; 
        winBanner.style.display = 'flex';
        winBanner.innerText = (gameMode !== 'normal') ? "試煉成功" : "戰役完勝";
    } else {
        deathBanner.style.display = 'flex'; 
        winBanner.style.display = 'none';
        
        if (isSurrender) {
            deathBanner.innerText = "戰鬥已撤退";
        } else {
            deathBanner.innerText = (gameMode !== 'normal') ? "試煉失敗" : "你已死亡";
        }
    }
    
    deathScreen.style.display = 'flex';
    
    setTimeout(() => { 
        deathScreen.classList.add('visible'); 
    }, 10);

    setTimeout(() => {
        deathScreen.classList.remove('visible');
        
        setTimeout(() => {
            deathScreen.style.display = 'none'; 
            gameUI.style.display = 'none'; 
            homeScreen.style.display = 'flex';
            deathBanner.style.display = ''; 
            winBanner.style.display = '';
            
            let runStatusText = "";
            if (isSurrender) {
                runStatusText = "【戰鬥撤退】";
            } else if (gameMode === 'sniper_trial') {
                runStatusText = isWin ? "【狙擊手試煉成功】" : "【狙擊手試煉失敗】";
            } else if (gameMode === 'octopus_trial') {
                runStatusText = isWin ? "【八爪魚試煉成功】" : "【八爪魚試煉失敗】";
            } else if (gameMode === 'chase_trial') {
                runStatusText = isWin ? "【追擊試煉成功】" : "【追擊試煉失敗】";
            } else {
                runStatusText = isWin ? "【戰役完勝】" : "上次戰鬥結算";
            }

            let dropText = isWin && runDrops.length > 0 
                ? `<br>獲得裝備：${runDrops.map(d => `<span class="rarity-${d.rarity}">${d.name}</span>`).join(', ')}` 
                : '';

            lastRunStats.innerHTML = `${runStatusText}：擊殺 ${score} | 等級 ${level} | 時間 ${timeStr}<br>獲得獎勵：💰 ${earnedGold}${dropText}`;
            
            updateChapterUI(); 
            updateUpgradeUI(); 
            updateBestStats();
            updateTrialUI(); 
            updateEquipmentUI(); 
        }, 1000);
    }, 3000);
}

function createEnemy(typeKey) {
    const data = enemyTypes[typeKey];
    
    if (!encounteredEnemies.has(typeKey) && gameMode === 'normal') {
        encounteredEnemies.add(typeKey); 
        showEnemyBanner(typeKey); 
    }

    let x, y; 
    const side = Math.floor(Math.random() * 4);
    
    if (side === 0) { 
        x = Math.random() * canvas.width; 
        y = -50; 
    } else if (side === 1) { 
        x = Math.random() * canvas.width; 
        y = canvas.height + 50; 
    } else if (side === 2) { 
        x = -50; 
        y = Math.random() * canvas.height; 
    } else { 
        x = canvas.width + 50; 
        y = Math.random() * canvas.height; 
    }
    
    let scaling = 0;
    if (typeKey === 'tank' || typeKey === 'sniperBoss' || typeKey === 'octopusBoss') {
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
    
    const finalMult = chapMult * trialMult * trialLevelMult;

    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = (gameMode === 'normal') ? 1 + (0.5 * elapsedMins) : 1;

    let newEnemy = { 
        ...data, 
        id: enemyIdCounter++, 
        type: typeKey, 
        x: x, 
        y: y, 
        currentHp: (data.hp + scaling) * finalMult * timeMult,
        maxHp: (data.hp + scaling) * finalMult * timeMult,
        damage: data.damage * finalMult * timeMult, 
        exp: (gameMode === 'chase_trial') ? 0 : data.exp,
        lastAttack: 0 
    };

    if (typeKey === 'octopusBoss') {
        newEnemy.phase = 1;
        newEnemy.isCharging = false;
        newEnemy.chargeTimer = 0;
        newEnemy.shockwaveActive = false;
        newEnemy.shockwaveRadius = 0;
        newEnemy.shockwaveHitPlayer = false;
        newEnemy.baseColor = data.color;
    }

    enemies.push(newEnemy);
}

function handleSpawning() {
    if (gameMode !== 'normal') return;

    const elapsedSecs = Math.floor(totalFrames / 60);
    const currentMin = Math.floor(elapsedSecs / 60);
    const currentChapInfo = chapterData[selectedChapter - 1];
    
    if (currentChapInfo.hasBoss && elapsedSecs >= 300 && !bossSpawned) { 
        bossSpawned = true; 
        enemies = []; 
        if (selectedChapter === 1) {
            createEnemy('sniperBoss'); 
        } else if (selectedChapter === 2) {
            createEnemy('octopusBoss'); 
        }
        return; 
    }
    
    if (enemies.some(en => en.type === 'sniperBoss' || en.type === 'octopusBoss')) {
        return;
    }

    if (currentMin > lastElapsedMinute) {
        for (let i = 0; i < (3 - eliteSpawnedInCurrentMin); i++) {
            createEnemy('tank');
        }
        eliteSpawnedInCurrentMin = 0; 
        lastElapsedMinute = currentMin;
    }
    
    secondCounter++;
    
    if (secondCounter >= 60) {
        secondCounter = 0;
        if (Math.random() < 0.05) { 
            createEnemy('tank'); 
            eliteSpawnedInCurrentMin++; 
        }
    }
    
    if (enemies.filter(en => en.type !== 'tank').length < 7) {
        if (Math.random() < 0.7) {
            createEnemy('normal');
        } else {
            createEnemy('charger');
        }
    }
}

function update(dt) {
    if (!gameActive || !gameStarted || isPaused) {
        return;
    }
    
    const now = Date.now(); // 統一移動至函式最上方，供所有邏輯共用
    
    totalFrames++;
    const elapsedSecs = Math.floor(totalFrames / 60);
    timerEl.innerText = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    handleSpawning(); 
    updateStatsUI();
    
    if (gameMode === 'chase_trial' && enemies.length === 0 && gameStarted && score > 0) {
        handleEndGame(true, false); 
        return;
    }
    
    const moveStep = player.speed * (dt * 60);
    if ((keys['w'] || keys['ArrowUp']) && player.y > player.size / 2) {
        player.y -= moveStep;
    }
    if ((keys['s'] || keys['ArrowDown']) && player.y < canvas.height - player.size / 2) {
        player.y += moveStep;
    }
    if ((keys['a'] || keys['ArrowLeft']) && player.x > player.size / 2) {
        player.x -= moveStep;
    }
    if ((keys['d'] || keys['ArrowRight']) && player.x < canvas.width - player.size / 2) {
        player.x += moveStep;
    }
    
    if (now - player.lastShot > player.fireRate && enemies.length > 0) {
        let closest = null;
        let minDist = Infinity;
        enemies.forEach(en => {
            const d = Math.hypot(en.x - player.x, en.y - player.y);
            if (d < minDist) { 
                minDist = d; 
                closest = en; 
            }
        });
        if (closest) {
            const angle = Math.atan2(closest.y - player.y, closest.x - player.x);
            for(let i = 0; i < player.bulletCount; i++) {
                const multiSpread = (i - (player.bulletCount - 1) / 2) * 0.15;
                const randomSpread = (Math.random() - 0.5) * player.spread;
                projectiles.push({ 
                    x: player.x, 
                    y: player.y, 
                    vx: Math.cos(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    vy: Math.sin(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    speed: player.bulletSpeed, 
                    size: 5, 
                    bounce: player.bounces, 
                    chains: player.chainBounce, 
                    hitIds: new Set(), 
                    toRemove: false
                });
            }
            player.lastShot = now;
        }
    }
    
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        let ep = enemyProjectiles[i];
        
        if (ep.type === 'homing') {
            const dx = player.x - ep.x;
            const dy = player.y - ep.y;
            const d = Math.hypot(dx, dy);
            if (ep.vx !== undefined && ep.vy !== undefined) {
                ep.vx += (dx / d) * 0.2 * (dt * 60); 
                ep.vy += (dy / d) * 0.2 * (dt * 60);
                const currV = Math.hypot(ep.vx, ep.vy);
                if(currV > 6) { 
                    ep.vx = (ep.vx / currV) * 6; 
                    ep.vy = (ep.vy / currV) * 6; 
                }
                ep.x += ep.vx * (dt * 60); 
                ep.y += ep.vy * (dt * 60);
            } else {
                ep.x += (dx / d) * 5 * (dt * 60); 
                ep.y += (dy / d) * 5 * (dt * 60);
            }
        } else if (ep.type === 'accel') { 
            let accelFactor = Math.pow(1.03, dt * 60);
            ep.vx *= accelFactor; 
            ep.vy *= accelFactor; 
            ep.x += ep.vx * (dt * 60); 
            ep.y += ep.vy * (dt * 60);
        } else if (ep.type === 's-curve') {
            ep.lifeTime += dt * 8; 
            let amplitude = 40; 
            let forwardSpeed = ep.speed * dt * 60;
            
            ep.centerX += Math.cos(ep.baseAngle) * forwardSpeed;
            ep.centerY += Math.sin(ep.baseAngle) * forwardSpeed;
            
            let orthX = Math.cos(ep.baseAngle + Math.PI/2) * Math.sin(ep.lifeTime) * amplitude;
            let orthY = Math.sin(ep.baseAngle + Math.PI/2) * Math.sin(ep.lifeTime) * amplitude;
            
            ep.x = ep.centerX + orthX;
            ep.y = ep.centerY + orthY;
        }

        if (Math.hypot(ep.x - player.x, ep.y - player.y) < player.size / 2 + ep.size) {
            player.hp -= ep.damage; 
            
            if (ep.isVampiric && ep.bossId !== undefined) {
                let boss = enemies.find(e => e.id === ep.bossId);
                if (boss) {
                    boss.currentHp = Math.min(boss.maxHp, boss.currentHp + (boss.maxHp * 0.05));
                }
            }
            
            enemyProjectiles.splice(i, 1);
            if (player.hp <= 0 && gameStarted) {
                handleEndGame(false, false); 
            }
            continue;
        }
        
        if (ep.x < -200 || ep.x > canvas.width + 200 || ep.y < -200 || ep.y > canvas.height + 200) {
            enemyProjectiles.splice(i, 1);
        }
    }
    
    for (let pi = projectiles.length - 1; pi >= 0; pi--) {
        let p = projectiles[pi];
        p.x += p.vx * (dt * 60); 
        p.y += p.vy * (dt * 60);
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            if (p.bounce > 0) {
                if (p.x < 0 || p.x > canvas.width) {
                    p.vx *= -1;
                }
                if (p.y < 0 || p.y > canvas.height) {
                    p.vy *= -1;
                }
                p.bounce--;
            } else {
                p.toRemove = true;
            }
        }
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            let en = enemies[ei];
            if (!p.hitIds.has(en.id) && Math.hypot(p.x - en.x, p.y - en.y) < p.size + en.size / 2) {
                en.currentHp -= player.damage; 
                p.hitIds.add(en.id);
                if (p.chains > 0) {
                    p.chains--;
                    const nextTargets = enemies.filter(e => !p.hitIds.has(e.id) && e.currentHp > 0);
                    if (nextTargets.length > 0) {
                        let target = nextTargets[0];
                        let mD = Infinity;
                        nextTargets.forEach(nt => { 
                            let d = Math.hypot(p.x - nt.x, p.y - nt.y); 
                            if(d < mD) {
                                mD = d; 
                                target = nt;
                            } 
                        });
                        const angle = Math.atan2(target.y - p.y, target.x - p.x);
                        p.vx = Math.cos(angle) * p.speed; 
                        p.vy = Math.sin(angle) * p.speed;
                    } else {
                        p.toRemove = true;
                    }
                } else {
                    p.toRemove = true;
                }
                
                if (en.currentHp <= 0) {
                    const isBoss = (en.type === 'sniperBoss' || en.type === 'octopusBoss');
                    score++; 
                    exp += en.exp; 
                    enemies.splice(ei, 1);
                    
                    if (isBoss) { 
                        if (gameMode === 'normal') {
                            const dropChance = isTrialMode ? 0.8 : 0.6;
                            if (Math.random() < dropChance) {
                                runDrops.push(generateRandomEquipment());
                            }
                        }
                        handleEndGame(true, false); 
                        return; 
                    } 
                }
                break; 
            }
        }
        if (p.toRemove) {
            projectiles.splice(pi, 1);
        }
    }
    
    while (exp >= expToNext) {
        level++; 
        exp -= expToNext; 
        expToNext += 5;
        const availablePool = runUpgrades.filter(u => u.stars < 5);
        if (availablePool.length > 0) {
            showLevelUp(); 
            return; 
        } else {
            let mins = Math.max(1, Math.floor(elapsedSecs / 60));
            let autoGold = Math.floor(mins * 0.8 * 100) * ((gameMode === 'normal' && isTrialMode) ? 3 : 1);
            runBonusGold += autoGold;
            floatingTexts.push({ 
                x: player.x - 20, 
                y: player.y - 40, 
                text: `+${autoGold} 💰`, 
                life: 90 
            });
        }
    }
    
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 1 * (dt * 60); 
        floatingTexts[i].life--;   
        if (floatingTexts[i].life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
    
    const chapMult = (gameMode === 'normal') ? chapterData[selectedChapter - 1].multiplier : 1;
    const trialMult = (gameMode === 'normal' && isTrialMode) ? 5 : 1;
    let trialLevelMult = 1;
    if (gameMode === 'sniper_trial') trialLevelMult = 1 + (sniperTrialLevel * 0.2);
    if (gameMode === 'octopus_trial') trialLevelMult = 1 + (octopusTrialLevel * 0.2);
    if (gameMode === 'chase_trial') trialLevelMult = 1 + (chaseTrialLevel * 0.2);
    
    const finalMult = chapMult * trialMult * trialLevelMult;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = (gameMode === 'normal') ? 1 + (0.5 * elapsedMins) : 1;
    
    enemies.forEach(en => {
        const dx = player.x - en.x;
        const dy = player.y - en.y;
        const dist = Math.hypot(dx, dy);
        
        if (en.type === 'sniperBoss') {
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
        } else if (en.type === 'octopusBoss') {
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
        } else {
            if (dist > 0) {
                const enemyMoveStep = en.speed * (dt * 60);
                en.x += (dx / dist) * enemyMoveStep; 
                en.y += (dy / dist) * enemyMoveStep;
            }
        }
        
        if (dist < player.size / 2 + en.size / 2) { 
            player.hp -= en.damage * dt; 
            if (player.hp <= 0 && gameStarted) {
                handleEndGame(false, false); 
            }
        }
    });
}

function draw() {
    ctx.fillStyle = '#050505'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) {
        return;
    }
    
    enemies.forEach(en => { 
        if (en.shockwaveActive) {
            ctx.beginPath();
            ctx.arc(en.x, en.y, en.shockwaveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 0, ${Math.max(0, 1 - (en.shockwaveRadius / 450))})`; 
            ctx.lineWidth = 15;
            ctx.stroke();
        }
        
        ctx.fillStyle = en.color; 
        ctx.fillRect(en.x - en.size / 2, en.y - en.size / 2, en.size, en.size); 
    });
    
    ctx.fillStyle = '#00d2ff'; 
    ctx.shadowBlur = 10; 
    ctx.shadowColor = '#00d2ff';
    if (player.x) {
        ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
    }
    ctx.shadowBlur = 0;
    
    projectiles.forEach(p => { 
        ctx.fillStyle = '#fff'; 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); 
        ctx.fill(); 
    });
    
    enemyProjectiles.forEach(ep => { 
        ctx.fillStyle = ep.color; 
        ctx.beginPath(); 
        ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2); 
        ctx.fill(); 
    });
    
    floatingTexts.forEach(ft => {
        ctx.fillStyle = `rgba(255, 215, 0, ${ft.life / 60})`; 
        ctx.font = 'bold 22px Arial'; 
        ctx.fillText(ft.text, ft.x, ft.y);
    });
}
