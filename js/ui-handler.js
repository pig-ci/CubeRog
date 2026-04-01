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

enemyBanner.onclick = () => { enemyBanner.style.display = 'none'; gameActive = true; lastTime = 0; };

function updateTrialUI() {
    sniperTrialLvlDisplay.innerText = sniperTrialLevel;
    chaseTrialLvlDisplay.innerText = chaseTrialLevel;
    octopusTrialLvlDisplay.innerText = octopusTrialLevel;
    summonerTrialLvlDisplay.innerText = summonerTrialLevel;
    twinTrialLvlDisplay.innerText = twinTrialLevel;
}

showSniperTrialBtn.onclick = () => {
    let dropText = sniperTrialLevel % 5 === 0 ? "🎁 <span class='rarity-uncommon'>隨機精良裝備 x1</span>" : "🎁 <span class='rarity-common'>隨機普通裝備 x1</span>";
    sniperTrialDesc.innerHTML = `這是 <strong>Lv.${sniperTrialLevel}</strong> 的狙擊手挑戰。<br>敵人強度提升為 <strong>${(1 + sniperTrialLevel * 0.2).toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「狙擊手」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 2000 金幣<br>${dropText}`;
    sniperTrialScreen.style.display = 'flex';
};
closeSniperTrialBtn.onclick = () => { sniperTrialScreen.style.display = 'none'; };
startSniperTrialBtn.onclick = () => { sniperTrialScreen.style.display = 'none'; initGame('sniper_trial'); };

showOctopusTrialBtn.onclick = () => {
    octopusTrialDesc.innerHTML = `這是 <strong>Lv.${octopusTrialLevel}</strong> 的八爪魚挑戰。<br>敵人強度提升為 <strong>${(1 + octopusTrialLevel * 0.2).toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「深淵八爪魚」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 3000 金幣<br>🎁 <span class='rarity-uncommon'>30%精良</span> / <span class='rarity-common'>70%普通</span> 隨機裝備 x1`;
    octopusTrialScreen.style.display = 'flex';
};
closeOctopusTrialBtn.onclick = () => { octopusTrialScreen.style.display = 'none'; };
startOctopusTrialBtn.onclick = () => { octopusTrialScreen.style.display = 'none'; initGame('octopus_trial'); };

showChaseTrialBtn.onclick = () => {
    chaseTrialDesc.innerHTML = `這是 <strong>Lv.${chaseTrialLevel}</strong> 的追擊挑戰。<br>敵人強度提升為 <strong>${(1 + chaseTrialLevel * 0.2).toFixed(1)} 倍</strong>！<br><br>你將獲得 3 次初始升級機會，然後面對 140 隻強化衝鋒方塊的猛攻。盡力存活！<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 1500 金幣`;
    chaseTrialScreen.style.display = 'flex';
};
closeChaseTrialBtn.onclick = () => { chaseTrialScreen.style.display = 'none'; };
startChaseTrialBtn.onclick = () => { chaseTrialScreen.style.display = 'none'; initGame('chase_trial'); };

showSummonerTrialBtn.onclick = () => {
    summonerTrialDesc.innerHTML = `這是 <strong>Lv.${summonerTrialLevel}</strong> 的招喚師挑戰。<br>敵人強度提升為 <strong>${(1 + summonerTrialLevel * 0.2).toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「招喚師」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 2000 金幣<br>🎁 <span class='rarity-common'>33%普通</span>/<span class='rarity-uncommon'>33%精良</span>/<span class='rarity-rare'>33%稀有</span> 隨機裝備 x1`;
    summonerTrialScreen.style.display = 'flex';
};
closeSummonerTrialBtn.onclick = () => { summonerTrialScreen.style.display = 'none'; };
startSummonerTrialBtn.onclick = () => { summonerTrialScreen.style.display = 'none'; initGame('summoner_trial'); };

showTwinTrialBtn.onclick = () => {
    twinTrialDesc.innerHTML = `這是 <strong>Lv.${twinTrialLevel}</strong> 的雙子挑戰。<br>敵人強度提升為 <strong>${(1 + twinTrialLevel * 0.2).toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，面對相連且會復活的雙子頭目。走位躲避藍彈，摧毀紅彈！必須在15秒內將兩者全數擊殺。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 1000 金幣<br>🎁 <span class='rarity-uncommon'>95%精良</span> / <span class='rarity-rare'>5%稀有</span> 隨機裝備 x1`;
    twinTrialScreen.style.display = 'flex';
};
closeTwinTrialBtn.onclick = () => { twinTrialScreen.style.display = 'none'; };
startTwinTrialBtn.onclick = () => { twinTrialScreen.style.display = 'none'; initGame('twin_trial'); };

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

    const boss = enemies.find(en => en.type === 'sniperBoss' || en.type === 'octopusBoss' || en.type === 'summonerBoss');
    let redTwin = enemies.find(e => e.type === 'twinBossRed');
    let blueTwin = enemies.find(e => e.type === 'twinBossBlue');
    
    if (redTwin && blueTwin) {
        bossHpContainer.style.display = 'block';
        bossNameEl.innerText = "雙子頭目 (紅 / 藍)";
        // 確保第二條血條容器可見，並更新填充寬度
        bossHpOuter2.style.display = 'block';
        bossHpFill.style.width = Math.max(0, (redTwin.currentHp / redTwin.maxHp * 100)) + '%';
        bossHpFill2.style.width = Math.max(0, (blueTwin.currentHp / blueTwin.maxHp * 100)) + '%';
        // 根據顏色區分（可選）
        bossHpFill.style.background = 'linear-gradient(90deg, #aa0000, #ff4d4d)';
        bossHpFill2.style.background = 'linear-gradient(90deg, #0000aa, #4d4dff)';
    } else if (boss) {
        bossHpContainer.style.display = 'block'; 
        bossNameEl.innerText = boss.name; 
        bossHpFill.style.width = Math.max(0, (boss.currentHp / boss.maxHp * 100)) + '%';
        bossHpFill.style.background = 'linear-gradient(90deg, #aa0000, #ff0055)';
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
    if (item.stats.speed) statsHtml += `移動速度: +${item.stats.speed}<br>`;
    
    itemModalStats.innerHTML = statsHtml;

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
