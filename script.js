const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- DOM 元素獲取 ---
const homeScreen = document.getElementById('home-screen');
const gameUI = document.getElementById('game-ui');
const hpFill = document.getElementById('hp-fill');
const expFill = document.getElementById('exp-fill');
const lvlEl = document.getElementById('lvl');
const killsEl = document.getElementById('kills');
const timerEl = document.getElementById('timer-container');
const levelUpUI = document.getElementById('level-up');
const optionsContainer = document.getElementById('options-container');
const startBtn = document.getElementById('start-btn');
const deathScreen = document.getElementById('death-screen');
const deathBanner = document.querySelector('.death-banner'); 
const winBanner = document.getElementById('win-banner');
const totalGoldEl = document.getElementById('total-gold');
const lastRunStats = document.getElementById('last-run-stats');
const bestRunStats = document.getElementById('best-run-stats');

const enemyBanner = document.getElementById('enemy-banner');
const enemyNameEl = document.getElementById('enemy-name');
const enemyDescEl = document.getElementById('enemy-desc');
const upgradeCubeBtn = document.getElementById('upgrade-cube-btn');
const cubeLvlDisplay = document.getElementById('cube-lvl-display');
const upgradeCostDisplay = document.getElementById('upgrade-cost-display');

const chapterTitleEl = document.getElementById('chapter-title');
const prevChapBtn = document.getElementById('prev-chapter-btn');
const nextChapBtn = document.getElementById('next-chapter-btn');

const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const endBattleBtn = document.getElementById('end-battle-btn');

// --- 遊戲狀態變數 ---
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let gameActive = false;
let gameStarted = false; 
let isPaused = false;
let score = 0, level = 1, exp = 0, expToNext = 6;
let totalFrames = 0; 
let eliteSpawnedInCurrentMin = 0, lastElapsedMinute = 0, secondCounter = 0;
let enemyIdCounter = 0;
let lastTime = 0; 

let player = {};
let projectiles = [], enemies = [], keys = {};
let enemyProjectiles = []; 
let encounteredEnemies = new Set(); 
let bossSpawned = false; 

// --- 章節狀態與配置 ---
let unlockedChapter = parseInt(localStorage.getItem('cubeRPG_unlockedChapter') || 1);
let selectedChapter = 1;

const chapterData = [
    { id: 1, name: '第一章：方塊森林', multiplier: 1, hasBoss: true },
    { id: 2, name: '第二章：方塊山谷', multiplier: 3, hasBoss: false }
];

function updateChapterUI() {
    chapterTitleEl.innerText = chapterData[selectedChapter - 1].name;
    
    if (unlockedChapter > 1) {
        prevChapBtn.style.display = 'block';
        nextChapBtn.style.display = 'block';
        prevChapBtn.disabled = (selectedChapter === 1);
        nextChapBtn.disabled = (selectedChapter === unlockedChapter || selectedChapter === chapterData.length);
    } else {
        prevChapBtn.style.display = 'none';
        nextChapBtn.style.display = 'none';
    }
}

prevChapBtn.onclick = () => {
    if (selectedChapter > 1) { selectedChapter--; updateChapterUI(); }
};
nextChapBtn.onclick = () => {
    if (selectedChapter < unlockedChapter && selectedChapter < chapterData.length) { selectedChapter++; updateChapterUI(); }
};

// --- 暫停選單邏輯 ---
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        gameActive = false;
        pauseMenu.style.display = 'flex';
    } else {
        pauseMenu.style.display = 'none';
        gameActive = true;
        lastTime = 0;
    }
}

resumeBtn.onclick = togglePause;
restartBtn.onclick = () => {
    pauseMenu.style.display = 'none';
    isPaused = false;
    initGame();
};
endBattleBtn.onclick = () => {
    pauseMenu.style.display = 'none';
    isPaused = false;
    handleEndGame(false, true);
};

// --- 數據配置 ---
const enemyTypes = {
    normal: { 
        name: '紅色方塊', 
        desc: '最基礎的敵人，會緩慢地向你靠近。',
        color: '#ff4d4d', size: 25, hp: 65, speed: 1.6, damage: 15, exp: 1 
    },
    charger: { 
        name: '衝鋒方塊', 
        desc: '速度極快且致命，小心它的突襲！',
        color: '#ffaa00', size: 18, hp: 40, speed: 4.5, damage: 30, exp: 2 
    },
    tank: { 
        name: '裝甲方塊', 
        desc: '巨大的威脅，擁有極高的生命值與破壞力。',
        color: '#7700aa', size: 55, hp: 350, speed: 1, damage: 35, exp: 15 
    },
    sniperBoss: { 
        name: '狙擊手', 
        desc: '最終Boss，會保持距離並發射多種追蹤彈藥。',
        color: '#ff0055', size: 65, hp: 25000, speed: 2, damage: 20, exp: 100 
    }
};

const upgradePool = [
    { name: '射速強化', desc: '射擊頻率提升 20%', action: () => player.fireRate *= 0.8 },
    { name: '威力加強', desc: '子彈傷害 +40', action: () => player.damage += 40 },
    { name: '多重射擊', desc: '子彈數量 +1', action: () => player.bulletCount += 1 },
    { name: '霰彈射擊', desc: '子彈數量 +2 且散射變高', action: () => { player.bulletCount += 2; player.spread += 0.25; } },
    { name: '鏈鎖彈射', desc: '擊中後彈向另一名敵人', action: () => player.chainBounce += 1 },
    { name: '速射散射', desc: '射速大幅提升但帶有散射', action: () => { player.fireRate *= 0.6; player.spread += 0.25; } },
    { name: '超音速彈', desc: '子彈飛行速度大幅提升', action: () => player.bulletSpeed += 6 },
    { name: '超頻位移', desc: '移動速度提升 15%', action: () => player.speed += 0.8 },
    { name: '路徑反彈', desc: '子彈撞牆可反彈 1 次', action: () => player.bounces += 1 },
    { name: '結構加固', desc: '最大生命提升 40', action: () => { player.maxHp += 40; player.hp += 40; } },
    { name: '生命回復', desc: '立即生命回復 80', action: () => player.hp = Math.min(player.maxHp, player.hp + 80) }
];

// --- 分頁與強化邏輯 ---
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabName).style.display = 'block';
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    if(tabName === 'upgrade') updateUpgradeUI();
};

let cubeLevel = parseInt(localStorage.getItem('cubeRPG_cubeLevel') || 1);
function getUpgradeCost(lvl) { return Math.floor(500 * Math.pow(1.35, lvl - 1)); }

function updateUpgradeUI() {
    const cost = getUpgradeCost(cubeLevel);
    const gold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    cubeLvlDisplay.innerText = cubeLevel;
    upgradeCostDisplay.innerText = cost;
    totalGoldEl.innerText = gold;
    document.getElementById('atk-bonus').innerText = (cubeLevel - 1) * 20;
    document.getElementById('hp-bonus').innerText = (cubeLevel - 1) * 10;
    upgradeCubeBtn.disabled = (gold < cost);
}

function updateBestStats() {
    const bestKills = localStorage.getItem('cubeRPG_bestKills') || 0;
    const bestTime = localStorage.getItem('cubeRPG_bestTime') || 0;
    const bestLevel = localStorage.getItem('cubeRPG_bestLevel') || 1;
    const m = Math.floor(bestTime / 60).toString().padStart(2, '0');
    const s = (bestTime % 60).toString().padStart(2, '0');
    if (bestKills > 0) {
        bestRunStats.innerHTML = `最高紀錄 - 擊殺: ${bestKills} | 等級: ${bestLevel} | 時間: ${m}:${s}`;
    }
}

upgradeCubeBtn.onclick = () => {
    const cost = getUpgradeCost(cubeLevel);
    let gold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    if (gold >= cost) {
        gold -= cost;
        cubeLevel++;
        localStorage.setItem('cubeRPG_gold', gold);
        localStorage.setItem('cubeRPG_cubeLevel', cubeLevel);
        updateUpgradeUI();
    }
};

startBtn.onclick = initGame;
enemyBanner.onclick = () => {
    enemyBanner.style.display = 'none';
    gameActive = true;
    lastTime = 0;
};

// --- 遊戲核心流程 ---
function initGame() {
    score = 0; level = 1; exp = 0; expToNext = 6;
    totalFrames = 0; eliteSpawnedInCurrentMin = 0; lastElapsedMinute = 0; secondCounter = 0;
    enemyIdCounter = 0; lastTime = 0;
    projectiles = []; enemies = []; enemyProjectiles = [];
    encounteredEnemies = new Set();
    bossSpawned = false;
    isPaused = false;
    
    deathScreen.classList.remove('visible');
    deathBanner.style.textShadow = ''; 
    deathBanner.style.color = '';

    const bonusAtk = (cubeLevel - 1) * 20;
    const bonusHp = (cubeLevel - 1) * 10;
    const speedMult = Math.pow(1.01, cubeLevel - 1);

    player = {
        x: canvas.width / 2, y: canvas.height / 2, size: 28,
        hp: 100 + bonusHp, maxHp: 100 + bonusHp, 
        speed: 4.8 * speedMult, 
        damage: 40 + bonusAtk,
        fireRate: 450, lastShot: 0,
        bulletCount: 1, bulletSize: 5, bulletSpeed: 12,
        bounces: 0, spread: 0, chainBounce: 0
    };

    homeScreen.style.display = 'none';
    gameUI.style.display = 'block';
    deathScreen.style.display = 'none';
    enemyBanner.style.display = 'none';
    pauseMenu.style.display = 'none';
    
    gameStarted = true;
    gameActive = true;
    updateStatsUI();
}

function handleEndGame(isWin = false, isSurrender = false) {
    gameStarted = false;
    gameActive = false;
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeStr = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    
    const baseGoldPerMin = (selectedChapter === 2) ? 1100 : 1000;
    let earnedGold = elapsedMins * baseGoldPerMin;
    if (isWin) earnedGold += 500; 
    
    if (isSurrender) earnedGold = Math.floor(earnedGold * 0.25);

    let currentGold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    localStorage.setItem('cubeRPG_gold', currentGold + earnedGold);

    if (isWin && selectedChapter === 1 && unlockedChapter < 2) {
        unlockedChapter = 2;
        localStorage.setItem('cubeRPG_unlockedChapter', unlockedChapter);
    }

    if (!isSurrender) {
        if (score > (parseInt(localStorage.getItem('cubeRPG_bestKills') || 0))) 
            localStorage.setItem('cubeRPG_bestKills', score);
        if (elapsedSecs > (parseInt(localStorage.getItem('cubeRPG_bestTime') || 0))) 
            localStorage.setItem('cubeRPG_bestTime', elapsedSecs);
        if (level > (parseInt(localStorage.getItem('cubeRPG_bestLevel') || 1))) 
            localStorage.setItem('cubeRPG_bestLevel', level);
    }
    
    if (isWin) {
        deathBanner.style.display = 'none';
        winBanner.style.display = 'flex';
    } else {
        deathBanner.style.display = 'flex';
        winBanner.style.display = 'none';
        if (isSurrender) {
            deathBanner.innerText = "戰鬥已撤退";
        } else {
            deathBanner.innerText = "你已死亡";
        }
    }
    
    deathScreen.style.display = 'flex';
    setTimeout(() => { deathScreen.classList.add('visible'); }, 10);

    setTimeout(() => {
        deathScreen.classList.remove('visible');
        setTimeout(() => {
            deathScreen.style.display = 'none';
            gameUI.style.display = 'none';
            homeScreen.style.display = 'flex';
            
            deathBanner.style.display = '';
            winBanner.style.display = '';
            
            let runStatusText = isWin ? "【戰役完勝】" : (isSurrender ? "【戰鬥撤退】" : "上次戰鬥結算");
            lastRunStats.innerHTML = `${runStatusText}：擊殺 ${score} | 等級 ${level} | 時間 ${timeStr}<br>獲得獎勵：💰 ${earnedGold}`;
            
            updateChapterUI(); 
            updateUpgradeUI();
            updateBestStats();
        }, 1000);
    }, 3000);
}

function showEnemyBanner(typeKey) {
    const data = enemyTypes[typeKey];
    gameActive = false;
    enemyNameEl.innerText = data.name;
    enemyDescEl.innerText = data.desc;
    enemyBanner.style.display = 'flex';
}

function createEnemy(typeKey) {
    const data = enemyTypes[typeKey];
    if (!encounteredEnemies.has(typeKey)) {
        encounteredEnemies.add(typeKey);
        showEnemyBanner(typeKey);
    }

    let x, y;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = Math.random() * canvas.width; y = -50; }
    else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height + 50; }
    else if (side === 2) { x = -50; y = Math.random() * canvas.height; }
    else { x = canvas.width + 50; y = Math.random() * canvas.height; }
    
    const scaling = (typeKey === 'tank' || typeKey === 'sniperBoss') ? level * 50 : level * 20;
    
    const chapMult = chapterData[selectedChapter - 1].multiplier;
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = 1 + (0.5 * elapsedMins);

    const finalHp = (data.hp + scaling) * chapMult * timeMult;
    const finalDamage = data.damage * chapMult * timeMult;
    const finalExp = data.exp;

    enemies.push({ 
        ...data, 
        id: enemyIdCounter++, 
        type: typeKey, x, y, 
        currentHp: finalHp, 
        maxHp: finalHp,
        damage: finalDamage,
        exp: finalExp,
        lastAttack: 0 
    });
}

function handleSpawning() {
    const elapsedSecs = Math.floor(totalFrames / 60);
    const currentMin = Math.floor(elapsedSecs / 60);
    const currentChapInfo = chapterData[selectedChapter - 1];
    
    if (currentChapInfo.hasBoss && elapsedSecs >= 300 && !bossSpawned) {
        bossSpawned = true;
        enemies = []; 
        createEnemy('sniperBoss');
        return;
    }

    if (enemies.some(en => en.type === 'sniperBoss')) return;

    if (currentMin > lastElapsedMinute) {
        for (let i = 0; i < (3 - eliteSpawnedInCurrentMin); i++) createEnemy('tank');
        eliteSpawnedInCurrentMin = 0;
        lastElapsedMinute = currentMin;
    }
    
    secondCounter++;
    if (secondCounter >= 60) {
        secondCounter = 0;
        if (Math.random() < 0.05) { createEnemy('tank'); eliteSpawnedInCurrentMin++; }
    }
    
    if (enemies.filter(en => en.type !== 'tank').length < 7) {
        createEnemy(Math.random() < 0.7 ? 'normal' : 'charger');
    }
}

function showLevelUp() {
    gameActive = false;
    optionsContainer.innerHTML = '';
    [...upgradePool].sort(() => 0.5 - Math.random()).slice(0, 3).forEach(upg => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<strong>${upg.name}</strong><br><small>${upg.desc}</small>`;
        btn.onclick = () => {
            upg.action();
            levelUpUI.style.display = 'none';
            gameActive = true;
            lastTime = 0;
        };
        optionsContainer.appendChild(btn);
    });
    levelUpUI.style.display = 'block';
}

function updateStatsUI() {
    killsEl.innerText = score;
    lvlEl.innerText = level;
    hpFill.style.width = Math.max(0, (player.hp / player.maxHp * 100)) + '%';
    expFill.style.width = (exp / expToNext * 100) + '%';
}

// --- 每一幀的邏輯 ---
function update(dt) {
    if (!gameActive || !gameStarted || isPaused) return;
    
    totalFrames++;
    const elapsedSecs = Math.floor(totalFrames / 60);
    timerEl.innerText = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    
    handleSpawning();
    updateStatsUI();

    const moveStep = player.speed * (dt * 60);
    if ((keys['w'] || keys['ArrowUp']) && player.y > player.size/2) player.y -= moveStep;
    if ((keys['s'] || keys['ArrowDown']) && player.y < canvas.height - player.size/2) player.y += moveStep;
    if ((keys['a'] || keys['ArrowLeft']) && player.x > player.size/2) player.x -= moveStep;
    if ((keys['d'] || keys['ArrowRight']) && player.x < canvas.width - player.size/2) player.x += moveStep;

    const now = Date.now();
    if (now - player.lastShot > player.fireRate && enemies.length > 0) {
        let closest = null, minDist = Infinity;
        enemies.forEach(en => {
            const d = Math.hypot(en.x - player.x, en.y - player.y);
            if (d < minDist) { minDist = d; closest = en; }
        });
        
        if (closest) {
            const angle = Math.atan2(closest.y - player.y, closest.x - player.x);
            for(let i=0; i<player.bulletCount; i++) {
                const multiSpread = (i - (player.bulletCount-1)/2) * 0.15;
                const randomSpread = (Math.random() - 0.5) * player.spread;
                projectiles.push({ 
                    x: player.x, y: player.y, 
                    vx: Math.cos(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    vy: Math.sin(angle + multiSpread + randomSpread) * player.bulletSpeed, 
                    speed: player.bulletSpeed, size: 5, bounce: player.bounces, 
                    chains: player.chainBounce, hitIds: new Set(), toRemove: false
                });
            }
            player.lastShot = now;
        }
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        let ep = enemyProjectiles[i];
        if (ep.type === 'homing') {
            const dx = player.x - ep.x, dy = player.y - ep.y, d = Math.hypot(dx, dy);
            ep.vx += (dx / d) * 0.15; 
            ep.vy += (dy / d) * 0.15;
            const currV = Math.hypot(ep.vx, ep.vy);
            if(currV > 6) { ep.vx = (ep.vx/currV)*6; ep.vy = (ep.vy/currV)*6; }
        } else if (ep.type === 'accel') {
            ep.vx *= 1.03; ep.vy *= 1.03;
        }
        ep.x += ep.vx * (dt * 60); ep.y += ep.vy * (dt * 60);

        if (Math.hypot(ep.x - player.x, ep.y - player.y) < player.size/2 + ep.size) {
            player.hp -= ep.damage;
            enemyProjectiles.splice(i, 1);
            if (player.hp <= 0 && gameStarted) handleEndGame(false, false); 
            continue;
        }
        if (ep.x < -100 || ep.x > canvas.width + 100 || ep.y < -100 || ep.y > canvas.height + 100) {
            enemyProjectiles.splice(i, 1);
        }
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

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            let en = enemies[ei];
            if (!p.hitIds.has(en.id) && Math.hypot(p.x - en.x, p.y - en.y) < p.size + en.size/2) {
                en.currentHp -= player.damage;
                p.hitIds.add(en.id);
                
                if (p.chains > 0) {
                    p.chains--;
                    const nextTargets = enemies.filter(e => !p.hitIds.has(e.id) && e.currentHp > 0);
                    if (nextTargets.length > 0) {
                        let target = nextTargets[0], mD = Infinity;
                        nextTargets.forEach(nt => { let d = Math.hypot(p.x-nt.x, p.y-nt.y); if(d<mD){mD=d; target=nt;} });
                        const angle = Math.atan2(target.y - p.y, target.x - p.x);
                        p.vx = Math.cos(angle) * p.speed; p.vy = Math.sin(angle) * p.speed;
                    } else p.toRemove = true;
                } else p.toRemove = true;

                if (en.currentHp <= 0) {
                    const isBoss = en.type === 'sniperBoss';
                    score++; exp += en.exp; enemies.splice(ei, 1);
                    if (isBoss) { handleEndGame(true, false); return; } 
                    if (exp >= expToNext) { 
                        level++; exp -= expToNext; expToNext += 5;
                        showLevelUp(); return; 
                    }
                }
                break; 
            }
        }
        if (p.toRemove) projectiles.splice(pi, 1);
    }

    const chapMult = chapterData[selectedChapter - 1].multiplier;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeMult = 1 + (0.5 * elapsedMins);

    enemies.forEach(en => {
        const dx = player.x - en.x, dy = player.y - en.y, dist = Math.hypot(dx, dy);
        
        if (en.type === 'sniperBoss') {
            const idealDist = 350;
            const bossMoveStep = en.speed * (dt * 60);
            if (dist > idealDist + 50) {
                en.x += (dx / dist) * bossMoveStep; en.y += (dy / dist) * bossMoveStep;
            } else if (dist < idealDist - 50) {
                en.x -= (dx / dist) * bossMoveStep; en.y -= (dy / dist) * bossMoveStep;
            }

            if (now - en.lastAttack > 2500) {
                en.lastAttack = now;
                const angle = Math.atan2(dy, dx);
                enemyProjectiles.push({
                    x: en.x, y: en.y, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4,
                    type: 'homing', color: '#ff4d4d', size: 8, damage: 25 * chapMult * timeMult
                });
                for(let i=0; i<4; i++) {
                    const sAngle = angle + (i - 1.5) * 0.4;
                    enemyProjectiles.push({
                        x: en.x, y: en.y, vx: Math.cos(sAngle)*1.5, vy: Math.sin(sAngle)*1.5,
                        type: 'accel', color: '#ffff00', size: 10, damage: 40 * chapMult * timeMult
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

        if (dist < player.size/2 + en.size/2) {
            player.hp -= en.damage * dt; 
            if (player.hp <= 0 && gameStarted) handleEndGame(false, false); 
        }
    });
}

// --- 渲染 ---
function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;

    enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x - en.size/2, en.y - en.size/2, en.size, en.size);
    });

    ctx.fillStyle = '#00d2ff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#00d2ff';
    if (player.x) ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
    ctx.shadowBlur = 0;

    projectiles.forEach(p => { 
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); 
    });

    enemyProjectiles.forEach(ep => {
        ctx.fillStyle = ep.color;
        ctx.beginPath(); ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI*2); ctx.fill();
    });
}

function animate(currentTime = 0) { 
    requestAnimationFrame(animate); 
    const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0;
    lastTime = currentTime;
    if (gameActive && gameStarted && !isPaused) update(deltaTime); 
    draw(); 
}

window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'Escape') {
        if (gameStarted && player.hp > 0 && levelUpUI.style.display !== 'block' && enemyBanner.style.display !== 'flex') {
            togglePause();
        }
    }
});
window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

// 初始化 UI
updateChapterUI();
updateUpgradeUI();
updateBestStats();
requestAnimationFrame(animate);
