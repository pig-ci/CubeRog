trialModeToggle.addEventListener('change', (e) => {
    isTrialMode = e.target.checked;
    if (isTrialMode) {
        tabBattle.classList.add('trial-active');
    } else {
        tabBattle.classList.remove('trial-active');
    }
});

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
    if (selectedChapter > 1) { 
        selectedChapter--; 
        updateChapterUI(); 
    } 
};

nextChapBtn.onclick = () => { 
    if (selectedChapter < unlockedChapter && selectedChapter < chapterData.length) { 
        selectedChapter++; 
        updateChapterUI(); 
    } 
};

function getStarsHTML(starLevel) {
    let html = '<div class="star-container">';
    for(let i = 1; i <= 5; i++) {
        if (i <= starLevel) {
            html += `<div class="star filled"></div>`;
        } else {
            html += `<div class="star empty"></div>`;
        }
    }
    html += '</div>';
    return html;
}

function togglePause() {
    if (levelUpUI.style.display === 'block' || enemyBanner.style.display === 'flex') return;

    isPaused = !isPaused;
    
    if (isPaused) {
        gameActive = false;
        
        acquiredUpgradesList.innerHTML = '';
        const acquired = runUpgrades.filter(u => u.stars > 0);
        
        if (acquired.length === 0) {
            acquiredUpgradesList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 10px 0;">尚未獲得任何升級</p>';
        } else {
            acquired.forEach(u => {
                acquiredUpgradesList.innerHTML += `
                    <div class="acquired-item">
                        <span style="color: var(--text-white);">${u.name}</span>
                        ${getStarsHTML(u.stars)}
                    </div>
                `;
            });
        }
        
        pauseMenu.style.display = 'flex';
    } else {
        pauseMenu.style.display = 'none';
        gameActive = true;
        lastTime = 0;
    }
}

resumeBtn.onclick = togglePause;
restartBtn.onclick = () => { pauseMenu.style.display = 'none'; isPaused = false; initGame(gameMode); };
endBattleBtn.onclick = () => { pauseMenu.style.display = 'none'; isPaused = false; handleEndGame(false, true); };

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById('tab-' + tabName).style.display = 'block';
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if (tabName === 'upgrade') updateUpgradeUI();
    else if (tabName === 'equip') updateEquipmentUI();
};

function getUpgradeCost(lvl) { 
    return Math.floor(500 * Math.pow(1.35, lvl - 1)); 
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(cubeLevel);
    const gold = parseInt(localStorage.getItem('cubeRPG_gold') || 0);
    
    cubeLvlDisplay.innerText = cubeLevel;
    upgradeCostDisplay.innerText = cost;
    totalGoldEl.innerText = gold;
    document.getElementById('atk-bonus').innerText = (cubeLevel - 1) * 20;
    document.getElementById('hp-bonus').innerText = (cubeLevel - 1) * 10;
    
    // 达到上限时禁用升级按钮
    if (cubeLevel >= MAX_CUBE_LEVEL) {
        upgradeCubeBtn.disabled = true;
        upgradeCubeBtn.title = "已達到到最高級";
        upgradeCostDisplay.innerText = "MAX";
    } else {
        upgradeCubeBtn.disabled = (gold < cost);
        upgradeCubeBtn.title = "";
    }
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
    if (cubeLevel >= MAX_CUBE_LEVEL) {
        return; // 已达上限
    }
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

enemyBanner.onclick = () => { enemyBanner.style.display = 'none'; gameActive = true; lastTime = 0; };

// ---------- 統一的試煉UI更新函數 ----------
function updateTrialUI() {
    for (const [key, cfg] of Object.entries(TRIAL_CONFIG)) {
        const lvlSpan = document.getElementById(cfg.ui.lvlDisplayId);
        if (lvlSpan) {
            lvlSpan.innerText = trialLevels[cfg.levelKey];
        }
    }
}

// ---------- 使用配置動態綁定所有試煉事件 ----------
function bindAllTrials() {
    for (const [key, cfg] of Object.entries(TRIAL_CONFIG)) {
        const screen = document.getElementById(cfg.ui.screenId);
        const showBtn = document.getElementById(cfg.ui.showBtnId);
        const startBtn = document.getElementById(cfg.ui.startBtnId);
        const closeBtn = document.getElementById(cfg.ui.closeBtnId);
        const descDiv = document.getElementById(cfg.ui.descId);
        
        if (!screen || !showBtn) continue;
        
        showBtn.onclick = () => {
            const level = trialLevels[cfg.levelKey];
            const mult = 1 + level * 0.2;
            descDiv.innerHTML = cfg.description(level, mult);
            screen.style.display = 'flex';
        };
        
        closeBtn.onclick = () => {
            screen.style.display = 'none';
        };
        
        startBtn.onclick = () => {
            screen.style.display = 'none';
            initGame(cfg.mode);
        };
    }
}

// 執行綁定（需確保DOM已載入）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAllTrials);
} else {
    bindAllTrials();
}

function showEnemyBanner(typeKey) {
    const data = enemyTypes[typeKey]; 
    gameActive = false;
    enemyNameEl.innerText = data.name; 
    enemyDescEl.innerText = data.desc;
    enemyBanner.style.display = 'flex';
}

function completeLevelUp() {
    levelUpsPending--;
    levelUpUI.style.display = 'none';

    if (levelUpsPending > 0) {
        showLevelUp(); 
    } else {
        if (gameMode === 'sniper_trial') createEnemy('sniperBoss'); 
        else if (gameMode === 'octopus_trial') createEnemy('octopusBoss'); 
        else if (gameMode === 'summoner_trial') createEnemy('summonerBoss');
        else if (gameMode === 'chase_trial') {
            for(let i=0; i<140; i++) createEnemy('charger'); 
        } else if (gameMode === 'twin_trial') {
            createEnemy('twinBossRed');
            createEnemy('twinBossBlue');
            let red = enemies[enemies.length - 2];
            let blue = enemies[enemies.length - 1];
            red.partnerId = blue.id;
            blue.partnerId = red.id;
        } else if (gameMode === 'prism_trial') {
            createEnemy('prismBoss');
        } else if (gameMode === 'gravity_trial') { // 加入重力試煉的生成邏輯
            createEnemy('gravityBoss');
        }
        gameActive = true;
        lastTime = 0;
    }
}

function showLevelUp() {
    gameActive = false;
    optionsContainer.innerHTML = '';
    
    const availablePool = runUpgrades.filter(u => u.stars < 5);
    const choices = [...availablePool].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    choices.forEach(upg => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        const nextStar = upg.stars + 1;

        btn.innerHTML = `
            <div class="upgrade-header">
                <strong>${upg.name}</strong>
                ${getStarsHTML(nextStar)}
            </div>
            <small>${upg.desc}</small>
        `;
        
        btn.onclick = () => {
            upg.action();
            upg.stars++;
            completeLevelUp(); 
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

    // 將 gravityBoss 加入可以顯示血條的名單中
    const boss = enemies.find(en => en.type === 'sniperBoss' || en.type === 'octopusBoss' || en.type === 'summonerBoss' || en.type === 'prismBoss' || en.type === 'gravityBoss');
    let redTwin = enemies.find(e => e.type === 'twinBossRed');
    let blueTwin = enemies.find(e => e.type === 'twinBossBlue');
    
    if (redTwin && blueTwin) {
        bossHpContainer.style.display = 'block';
        bossNameEl.innerText = "雙子頭目 (紅 / 藍)";
        bossHpOuter2.style.display = 'block';
        bossHpFill.style.width = Math.max(0, (redTwin.currentHp / redTwin.maxHp * 100)) + '%';
        bossHpFill2.style.width = Math.max(0, (blueTwin.currentHp / blueTwin.maxHp * 100)) + '%';
        bossHpFill.style.background = 'linear-gradient(90deg, #aa0000, #ff4d4d)';
        bossHpFill2.style.background = 'linear-gradient(90deg, #0000aa, #4d4dff)';
    } else if (boss) {
        bossHpContainer.style.display = 'block'; 
        bossNameEl.innerText = boss.name; 
        bossHpFill.style.width = Math.max(0, (boss.currentHp / boss.maxHp * 100)) + '%';
        
        // 可根據 Boss 改顏色，重力為紫色
        if (boss.type === 'gravityBoss') {
            bossHpFill.style.background = 'linear-gradient(90deg, #4B0082, #9400D3)';
        } else {
            bossHpFill.style.background = 'linear-gradient(90deg, #aa0000, #ff0055)';
        }
        bossHpOuter2.style.display = 'none';
    } else {
        bossHpContainer.style.display = 'none';
    }
}

function updateEquipmentUI() {
    let totalAtk = 0; let totalHp = 0; let totalSpeed = 0;

    for (let key in playerEquipment) {
        if (playerEquipment[key]) {
            if (playerEquipment[key].stats.atk) totalAtk += playerEquipment[key].stats.atk;
            if (playerEquipment[key].stats.hp) totalHp += playerEquipment[key].stats.hp;
            if (playerEquipment[key].stats.speed) totalSpeed += playerEquipment[key].stats.speed;
        }
    }

    equipStatsEl.innerHTML = `
        <p>裝備額外攻擊力: +${totalAtk}</p>
        <p>裝備額外生命值: +${totalHp}</p>
        <p>裝備額外移動速度: +${totalSpeed.toFixed(1)}</p>
    `;

    equippedSlotsEl.innerHTML = '';
    Object.keys(slotNames).forEach(slotKey => {
        const item = playerEquipment[slotKey];
        const div = document.createElement('div');
        div.className = `equip-slot ${item ? 'filled rarity-' + item.rarity : ''}`;
        
        if (item) {
            div.innerHTML = `<strong>${slotNames[slotKey]}</strong><br>${item.name}`;
            div.onclick = () => showItemModal(item, true);
        } else {
            div.innerHTML = `<span style="color:var(--text-muted)">${slotNames[slotKey]}<br>(空)</span>`;
        }
        equippedSlotsEl.appendChild(div);
    });

    inventoryListEl.innerHTML = '';
    if (playerInventory.length === 0) {
        inventoryListEl.innerHTML = '<p style="grid-column: span 3; text-align:center; color:var(--text-muted);">背包是空的</p>';
    } else {
        playerInventory.forEach(item => {
            const div = document.createElement('div');
            div.className = `inv-item rarity-${item.rarity}`;
            div.innerHTML = `${item.name}`;
            div.onclick = () => showItemModal(item, false);
            inventoryListEl.appendChild(div);
        });
    }
}

let currentSelectedItem = null;
let currentSelectedIsEquipped = false;

function showItemModal(item, isEquipped) {
    currentSelectedItem = item;
    currentSelectedIsEquipped = isEquipped;
    
    itemModalName.innerText = item.name;
    itemModalName.className = `popup-title rarity-${item.rarity}`;
    
    let statsHtml = `部位: ${slotNames[item.slot]}<br><br>`;
    if (item.stats.atk) statsHtml += `攻擊力: +${item.stats.atk}<br>`;
    if (item.stats.hp) statsHtml += `生命值: +${item.stats.hp}<br>`;
    if (item.stats.speed) statsHtml += `移動速度: +${item.stats.speed.toFixed(1)}<br>`;
    itemModalStats.innerHTML = statsHtml;
    
    const compareDiv = document.getElementById('item-modal-compare');
    if (compareDiv) {
        if (isEquipped) {
            compareDiv.innerHTML = '<p style="color: var(--text-muted); margin:0;">🔧 当前装备中</p>';
        } else {
            const curEquip = playerEquipment[item.slot];
            const attrMap = { atk: '攻擊力', hp: '生命值', speed: '移動速度' };
            
            if (!curEquip) {
                compareDiv.innerHTML = `
                    <div style="font-size:13px; color: var(--text-light); margin-bottom:5px;">📦 當前無裝備，裝備後將獲得：</div>
                    <div>⚔️ 攻擊力: +${item.stats.atk || 0}</div>
                    <div>❤️ 生命值: +${item.stats.hp || 0}</div>
                    <div>👟 移動速度: +${(item.stats.speed || 0).toFixed(1)}</div>
                `;
            } else {
                let compareHtml = '<div style="font-size:13px; color: var(--text-light); margin-bottom:5px;">📊 對比當前裝備：</div>';
                let hasDiff = false;
                
                for (let [key, chinese] of Object.entries(attrMap)) {
                    const newVal = item.stats[key] || 0;
                    const curVal = curEquip.stats[key] || 0;
                    const diff = newVal - curVal;
                    
                    if (diff !== 0 || newVal !== 0 || curVal !== 0) {
                        hasDiff = true;
                        const diffText = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                        const diffColor = diff > 0 ? '#7cfc00' : (diff < 0 ? '#ff8888' : '#aaa');
                        const curValStr = (key === 'speed') ? curVal.toFixed(1) : Math.floor(curVal);
                        const newValStr = (key === 'speed') ? newVal.toFixed(1) : Math.floor(newVal);
                        
                        compareHtml += `
                            <div style="margin: 6px 0; font-size:14px;">
                                ${chinese}: ${curValStr} → ${newValStr}
                                <span style="color: ${diffColor}; font-weight:bold;"> (${diffText})</span>
                            </div>
                        `;
                    }
                }
                
                if (!hasDiff) {
                    compareHtml += '<div style="color: var(--text-muted);">✨ 屬性與當前裝備完全相同</div>';
                }
                
                compareDiv.innerHTML = compareHtml;
            }
        }
    } else {
        console.warn('对比区域 #item-modal-compare 未找到，请检查 HTML 结构');
    }
    
    if (isEquipped) {
        itemModalEquipBtn.innerText = "卸下";
    } else {
        itemModalEquipBtn.innerText = "裝備";
    }
    
    if (!isEquipped && item.rarity !== 'rare') {
        itemModalCraftBtn.style.display = 'block';
        const identicalCount = playerInventory.filter(i => i.name === item.name && i.rarity === item.rarity).length;
        if (identicalCount >= 3) {
            itemModalCraftBtn.innerText = `合成更高階 (${identicalCount}/3)`;
            itemModalCraftBtn.style.background = 'var(--gold)';
            itemModalCraftBtn.style.color = 'black';
            itemModalCraftBtn.style.cursor = 'pointer';
            itemModalCraftBtn.disabled = false;
            itemModalCraftBtn.onclick = () => craftItem(item);
        } else {
            itemModalCraftBtn.innerText = `數量不足 (${identicalCount}/3)`;
            itemModalCraftBtn.style.background = 'var(--border-card)';
            itemModalCraftBtn.style.color = 'var(--text-muted)';
            itemModalCraftBtn.style.cursor = 'not-allowed';
            itemModalCraftBtn.disabled = true;
            itemModalCraftBtn.onclick = null;
        }
    } else {
        itemModalCraftBtn.style.display = 'none';
    }
    
    itemModal.style.display = 'flex';
}

function craftItem(baseItem) {
    let newInventory = [];
    let removedCount = 0;

    for (let i = 0; i < playerInventory.length; i++) {
        if (removedCount < 3 && playerInventory[i].name === baseItem.name && playerInventory[i].rarity === baseItem.rarity) {
            removedCount++;
        } else {
            newInventory.push(playerInventory[i]);
        }
    }

    playerInventory = newInventory;

    let nextRarity = 'uncommon';
    if (baseItem.rarity === 'uncommon') nextRarity = 'rare';

    let newItem = generateRandomEquipment(nextRarity, baseItem.slot);
    newItem.baseName = baseItem.baseName;
    newItem.name = (nextRarity === 'rare' ? '稀有 ' : '精良 ') + baseItem.baseName;
    
    playerInventory.push(newItem);
    localStorage.setItem('cubeRPG_inventory', JSON.stringify(playerInventory));
    
    updateEquipmentUI();
    showItemModal(newItem, false); 
}

itemModalCloseBtn.onclick = () => { itemModal.style.display = 'none'; };

itemModalEquipBtn.onclick = () => {
    if (currentSelectedIsEquipped) {
        playerEquipment[currentSelectedItem.slot] = null;
        playerInventory.push(currentSelectedItem);
    } else {
        const existing = playerEquipment[currentSelectedItem.slot];
        if (existing) {
            playerInventory.push(existing); 
        }
        playerEquipment[currentSelectedItem.slot] = currentSelectedItem;
        playerInventory = playerInventory.filter(i => i.id !== currentSelectedItem.id);
    }
    
    localStorage.setItem('cubeRPG_equipment', JSON.stringify(playerEquipment));
    localStorage.setItem('cubeRPG_inventory', JSON.stringify(playerInventory));
    
    itemModal.style.display = 'none';
    updateEquipmentUI();
};

// ---------- 已获得升级弹窗 ----------
const viewAcquiredBtn = document.getElementById('view-acquired-upgrades-btn');
const acquiredModal = document.getElementById('acquired-upgrades-modal');
const acquiredModalList = document.getElementById('acquired-upgrades-modal-list');
const closeAcquiredModalBtn = document.getElementById('close-acquired-upgrades-modal-btn');

if (viewAcquiredBtn) {
    viewAcquiredBtn.onclick = () => {
        acquiredModalList.innerHTML = '';
        const acquired = runUpgrades.filter(u => u.stars > 0);
        
        if (acquired.length === 0) {
            acquiredModalList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">尚未獲得任何升級</p>';
        } else {
            acquired.forEach(u => {
                const div = document.createElement('div');
                div.className = 'acquired-item';
                div.style.margin = '8px 0';
                div.innerHTML = `
                    <span style="color: var(--text-white);">${u.name}</span>
                    ${getStarsHTML(u.stars)}
                `;
                acquiredModalList.appendChild(div);
            });
        }
        
        acquiredModal.style.display = 'flex';
    };
}

if (closeAcquiredModalBtn) {
    closeAcquiredModalBtn.onclick = () => {
        acquiredModal.style.display = 'none';
    };
}
