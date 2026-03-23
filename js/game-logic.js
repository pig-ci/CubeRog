startBtn.onclick = () => initGame('normal');
function initGame(mode = 'normal') {
    gameMode = mode; // 設定全域狀態
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
    const bonusAtk = (cubeLevel - 1) * 20;
    const bonusHp = (cubeLevel - 1) * 10;
    const speedMult = Math.pow(1.01, cubeLevel - 1);
    player = {
        x: canvas.width / 2, 
        y: canvas.height / 2, 
        size: 28,
        hp: 100 + bonusHp, 
        maxHp: 100 + bonusHp, 
        speed: 4.8 * speedMult, 
        damage: 40 + bonusAtk,
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
    if (gameMode === 'sniper_trial') {
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
        let winBonus = 500;
        if(gameMode === 'sniper_trial') winBonus = 1500;
        else if(gameMode === 'chase_trial') winBonus = 1200;
        earnedGold += winBonus * trialGoldMult;
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
            } else if (gameMode === 'chase_trial') {
                runStatusText = isWin ? "【追擊試煉成功】" : "【追擊試煉失敗】";
            } else {
                runStatusText = isWin ? "【戰役完勝】" : "上次戰鬥結算";
            }

            lastRunStats.innerHTML = `${runStatusText}：擊殺 ${score} | 等級 ${level} | 時間 ${timeStr}<br>獲得獎勵：💰 ${earnedGold}`;
            
            updateChapterUI(); 
            updateUpgradeUI(); 
            updateBestStats();
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
    if (typeKey === 'tank' || typeKey === 'sniperBoss') {
        scaling = level * 50;
    } else {
        scaling = level * 20;
    }
    
    const chapMult = (gameMode === 'normal') ? chapterData[selectedChapter - 1].multiplier : 1;
    const trialMult = (gameMode === 'normal' && isTrialMode) ? 5 : 1;
    const chaseTrialMult = (gameMode === 'chase_trial' && typeKey === 'charger') ? 2 : 1;
    const finalMult = chapMult * trialMult * chaseTrialMult;

    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = (gameMode === 'normal') ? 1 + (0.5 * elapsedMins) : 1;

    enemies.push({ 
        ...data, 
        id: enemyIdCounter++, 
        type: typeKey, 
        x: x, 
        y: y, 
        currentHp: (data.hp + scaling) * finalMult * timeMult,
        maxHp: (data.hp + scaling) * finalMult * timeMult,
        damage: data.damage * finalMult * timeMult, 
        exp: (gameMode === 'chase_trial') ? 0 : data.exp, // *** 修正點 ***
        lastAttack: 0 
    });
}

function handleSpawning() {
    if (gameMode !== 'normal') return;

    const elapsedSecs = Math.floor(totalFrames / 60);
    const currentMin = Math.floor(elapsedSecs / 60);
    const currentChapInfo = chapterData[selectedChapter - 1];
    
    if (currentChapInfo.hasBoss && elapsedSecs >= 300 && !bossSpawned) { 
        bossSpawned = true; 
        enemies = []; 
        createEnemy('sniperBoss'); 
        return; 
    }
    
    if (enemies.some(en => en.type === 'sniperBoss')) {
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
    totalFrames++;
    const elapsedSecs = Math.floor(totalFrames / 60);
    timerEl.innerText = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    handleSpawning(); 
    updateStatsUI();
    if (gameMode === 'chase_trial' && enemies.length === 0 && gameStarted && score > 0) {
        handleEndGame(true, false); // 追擊試煉，殺光所有敵人即勝利
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
    const now = Date.now();
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
            ep.vx += (dx / d) * 0.15; 
            ep.vy += (dy / d) * 0.15;
            const currV = Math.hypot(ep.vx, ep.vy);
            if(currV > 6) { 
                ep.vx = (ep.vx / currV) * 6; 
                ep.vy = (ep.vy / currV) * 6; 
            }
        } else if (ep.type === 'accel') { 
            ep.vx *= 1.03; 
            ep.vy *= 1.03; 
        }
        ep.x += ep.vx * (dt * 60); 
        ep.y += ep.vy * (dt * 60);
        if (Math.hypot(ep.x - player.x, ep.y - player.y) < player.size / 2 + ep.size) {
            player.hp -= ep.damage; 
            enemyProjectiles.splice(i, 1);
            if (player.hp <= 0 && gameStarted) {
                handleEndGame(false, false); 
            }
            continue;
        }
        if (ep.x < -100 || ep.x > canvas.width + 100 || ep.y < -100 || ep.y > canvas.height + 100) {
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
                    const isBoss = en.type === 'sniperBoss';
                    score++; 
                    exp += en.exp; 
                    enemies.splice(ei, 1);
                    if (isBoss) { 
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
    const chaseTrialMult = (gameMode === 'chase_trial') ? 2 : 1;
    const finalMult = chapMult * trialMult * chaseTrialMult;
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
                    x: en.x, 
                    y: en.y, 
                    vx: Math.cos(angle) * 4, 
                    vy: Math.sin(angle) * 4, 
                    type: 'homing', 
                    color: '#ff4d4d', 
                    size: 8, 
                    damage: 25 * finalMult * timeMult
                });
                for(let i = 0; i < 4; i++) {
                    const sAngle = angle + (i - 1.5) * 0.4;
                    enemyProjectiles.push({ 
                        x: en.x, 
                        y: en.y, 
                        vx: Math.cos(sAngle) * 1.5, 
                        vy: Math.sin(sAngle) * 1.5, 
                        type: 'accel', 
                        color: '#ffff00', 
                        size: 10, 
                        damage: 40 * finalMult * timeMult
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
