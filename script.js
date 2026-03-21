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
const totalGoldEl = document.getElementById('total-gold');
const lastRunStats = document.getElementById('last-run-stats');
const bestRunStats = document.getElementById('best-run-stats');

// 新敵人公告與強化選單元素
const enemyBanner = document.getElementById('enemy-banner');
const enemyNameEl = document.getElementById('enemy-name');
const enemyDescEl = document.getElementById('enemy-desc');
const upgradeCubeBtn = document.getElementById('upgrade-cube-btn');
const cubeLvlDisplay = document.getElementById('cube-lvl-display');
const upgradeCostDisplay = document.getElementById('upgrade-cost-display');

// --- 遊戲狀態變數 ---
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let gameActive = false;
let gameStarted = false; 
let score = 0, level = 1, exp = 0, expToNext = 6;
let totalFrames = 0; 
let eliteSpawnedInCurrentMin = 0, lastElapsedMinute = 0, secondCounter = 0;
let enemyIdCounter = 0;
let lastTime = 0; 

let player = {};
let projectiles = [], enemies = [], keys = {};
let encounteredEnemies = new Set(); 

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

// --- 分頁切換系統 ---

window.switchTab = function(tabName) {
    // 隱藏所有分頁
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    // 移除所有導覽列 active 狀態
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // 顯示目標分頁
    document.getElementById('tab-' + tabName).style.display = 'block';
    // 設置當前導覽按鈕為 active (如果是透過點擊觸發)
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if(tabName === 'upgrade') updateUpgradeUI();
};

// --- 永久強化與紀錄邏輯 ---

let cubeLevel = parseInt(localStorage.getItem('cubeRPG_cubeLevel') || 1);

function getUpgradeCost(lvl) {
    return Math.floor(500 * Math.pow(1.35, lvl - 1));
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(cubeLevel);
    const gold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    
    cubeLvlDisplay.innerText = cubeLevel;
    upgradeCostDisplay.innerText = cost;
    totalGoldEl.innerText = gold; // 頂部金幣顯示
    
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

// --- 事件綁定 ---

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
    // 重置所有變數
    score = 0; level = 1; exp = 0; expToNext = 6;
    totalFrames = 0; eliteSpawnedInCurrentMin = 0; lastElapsedMinute = 0; secondCounter = 0;
    enemyIdCounter = 0; lastTime = 0;
    projectiles = []; enemies = [];
    encounteredEnemies = new Set();
    
    // 計算永久強化加成
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

    // UI 切換
    homeScreen.style.display = 'none';
    gameUI.style.display = 'block';
    deathScreen.style.display = 'none';
    enemyBanner.style.display = 'none';
    
    gameStarted = true;
    gameActive = true;
    updateStatsUI();
}

function gameOver() {
    gameStarted = false;
    gameActive = false;
    const elapsedSecs = Math.floor(totalFrames / 60);
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const timeStr = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    
    // 金幣結算 (每分鐘 1000)
    const earnedGold = elapsedMins * 1000;
    let currentGold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    localStorage.setItem('cubeRPG_gold', currentGold + earnedGold);

    // 紀錄更新
    const bestKills = parseInt(localStorage.getItem('cubeRPG_bestKills') || 0);
    const bestTime = parseInt(localStorage.getItem('cubeRPG_bestTime') || 0);
    const bestLevel = parseInt(localStorage.getItem('cubeRPG_bestLevel') || 1);
    if (score > bestKills) localStorage.setItem('cubeRPG_bestKills', score);
    if (elapsedSecs > bestTime) localStorage.setItem('cubeRPG_bestTime', elapsedSecs);
    if (level > bestLevel) localStorage.setItem('cubeRPG_bestLevel', level);

    // 顯示死亡橫幅
    deathScreen.style.display = 'flex';
    setTimeout(() => { deathScreen.classList.add('visible'); }, 10);

    // 延遲後回到首頁
    setTimeout(() => {
        deathScreen.classList.remove('visible');
        setTimeout(() => {
            deathScreen.style.display = 'none';
            gameUI.style.display = 'none';
            homeScreen.style.display = 'flex';
            
            // 更新首頁結算資訊
            lastRunStats.innerHTML = `上次戰鬥結算：擊殺 ${score} | 等級 ${level} | 時間 ${timeStr}<br>獲得獎勵：💰 ${earnedGold}`;
            
            updateUpgradeUI();
            updateBestStats();
        }, 1000);
    }, 3000); 
}

function showEnemyBanner(typeKey) {
    const data = enemyTypes[typeKey];
    gameActive = false; // 暫停遊戲
    enemyNameEl.innerText = data.name;
    enemyDescEl.innerText = data.desc;
    enemyBanner.style.display = 'flex';
}

function createEnemy(typeKey) {
    const data = enemyTypes[typeKey];
    
    // 偵測新敵人
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
    
    const scaling = typeKey === 'tank' ? level * 50 : level * 20;
    enemies.push({ 
        ...data, 
        id: enemyIdCounter++, 
        type: typeKey, x, y, 
        currentHp: data.hp + scaling, 
        maxHp: data.hp + scaling 
    });
}

function handleSpawning() {
    const elapsedSecs = Math.floor(totalFrames / 60);
    const currentMin = Math.floor(elapsedSecs / 60);
    
    // 每分鐘生成的坦克
    if (currentMin > lastElapsedMinute) {
        for (let i = 0; i < (3 - eliteSpawnedInCurrentMin); i++) createEnemy('tank');
        eliteSpawnedInCurrentMin = 0;
        lastElapsedMinute = currentMin;
    }
    
    // 隨機坦克生成
    secondCounter++;
    if (secondCounter >= 60) {
        secondCounter = 0;
        if (Math.random() < 0.05) { createEnemy('tank'); eliteSpawnedInCurrentMin++; }
    }
    
    // 基礎敵人維持
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
    if (!gameActive || !gameStarted) return;
    
    totalFrames++;
    const elapsedSecs = Math.floor(totalFrames / 60);
    timerEl.innerText = `${Math.floor(elapsedSecs/60).toString().padStart(2,'0')}:${(elapsedSecs%60).toString().padStart(2,'0')}`;
    
    handleSpawning();
    updateStatsUI();

    // 玩家移動
    const moveStep = player.speed * (dt * 60);
    if ((keys['w'] || keys['ArrowUp']) && player.y > player.size/2) player.y -= moveStep;
    if ((keys['s'] || keys['ArrowDown']) && player.y < canvas.height - player.size/2) player.y += moveStep;
    if ((keys['a'] || keys['ArrowLeft']) && player.x > player.size/2) player.x -= moveStep;
    if ((keys['d'] || keys['ArrowRight']) && player.x < canvas.width - player.size/2) player.x += moveStep;

    // 自動瞄準與射擊
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

    // 子彈邏輯
    for (let pi = projectiles.length - 1; pi >= 0; pi--) {
        let p = projectiles[pi];
        p.x += p.vx * (dt * 60); 
        p.y += p.vy * (dt * 60);

        // 撞牆反彈
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            if (p.bounce > 0) {
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                p.bounce--;
            } else { p.toRemove = true; }
        }

        // 命中敵人
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            let en = enemies[ei];
            if (!p.hitIds.has(en.id) && Math.hypot(p.x - en.x, p.y - en.y) < p.size + en.size/2) {
                en.currentHp -= player.damage;
                p.hitIds.add(en.id);
                
                // 鏈鎖彈射
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

                // 擊殺處理
                if (en.currentHp <= 0) {
                    score++; exp += en.exp; enemies.splice(ei, 1);
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

    // 敵人移動與傷害玩家
    enemies.forEach(en => {
        const dx = player.x - en.x, dy = player.y - en.y, dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const enemyMoveStep = en.speed * (dt * 60);
            en.x += (dx / dist) * enemyMoveStep;
            en.y += (dy / dist) * enemyMoveStep;
        }
        if (dist < player.size/2 + en.size/2) {
            player.hp -= en.damage * dt; 
            if (player.hp <= 0 && gameStarted) gameOver();
        }
    });
}

// --- 渲染 ---

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!gameStarted) return;

    // 畫敵人
    enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x - en.size/2, en.y - en.size/2, en.size, en.size);
    });

    // 畫玩家
    ctx.fillStyle = '#00d2ff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#00d2ff';
    if (player.x) ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
    ctx.shadowBlur = 0;

    // 畫子彈
    ctx.fillStyle = '#fff';
    projectiles.forEach(p => { 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); 
        ctx.fill(); 
    });
}

function animate(currentTime = 0) { 
    requestAnimationFrame(animate); 
    const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0;
    lastTime = currentTime;
    
    if (gameActive && gameStarted) update(deltaTime); 
    draw(); 
}

// --- 初始化執行 ---

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('resize', () => { 
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
});

// 啟動 UI
updateUpgradeUI();
updateBestStats();
requestAnimationFrame(animate);