// --- 試煉模式開關事件監聽 ---
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

// --- 輔助函數：生成 CSS 星星 HTML ---
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

// --- 暫停選單邏輯 ---
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        gameActive = false;
        
        // 渲染已獲得的升級清單
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

restartBtn.onclick = () => { 
    pauseMenu.style.display = 'none'; 
    isPaused = false; 
    initGame(gameMode); // 重新開始時保持模式
};

endBattleBtn.onclick = () => { 
    pauseMenu.style.display = 'none'; 
    isPaused = false; 
    handleEndGame(false, true); 
};

// --- 分頁與強化邏輯 ---
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.display = 'none';
    });
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
    });
    
    document.getElementById('tab-' + tabName).style.display = 'block';
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if(tabName === 'upgrade') {
        updateUpgradeUI();
    }
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

enemyBanner.onclick = () => { 
    enemyBanner.style.display = 'none'; 
    gameActive = true; 
    lastTime = 0; 
};

// --- 試煉 UI 邏輯 ---
showSniperTrialBtn.onclick = () => {
    sniperTrialScreen.style.display = 'flex';
};
closeSniperTrialBtn.onclick = () => {
    sniperTrialScreen.style.display = 'none';
};
startSniperTrialBtn.onclick = () => {
    sniperTrialScreen.style.display = 'none';
    initGame('sniper_trial'); 
};

showChaseTrialBtn.onclick = () => {
    chaseTrialScreen.style.display = 'flex';
};
closeChaseTrialBtn.onclick = () => {
    chaseTrialScreen.style.display = 'none';
};
startChaseTrialBtn.onclick = () => {
    chaseTrialScreen.style.display = 'none';
    initGame('chase_trial');
};

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
        showLevelUp(); // 如果還有待處理的升級，繼續顯示升級畫面
    } else {
        if (gameMode === 'sniper_trial') {
            createEnemy('sniperBoss'); // 升級完畢，生成Boss
        } else if (gameMode === 'chase_trial') {
            for(let i=0; i<140; i++) {
                createEnemy('charger'); // 升級完畢，生成大量衝鋒怪
            }
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
            completeLevelUp(); // 點擊後呼叫新的完成函式
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

    const boss = enemies.find(en => en.type === 'sniperBoss');
    
    if (boss) {
        if (bossHpContainer.style.display === 'none') { 
            bossHpContainer.style.display = 'block'; 
            bossNameEl.innerText = boss.name; 
        }
        bossHpFill.style.width = Math.max(0, (boss.currentHp / boss.maxHp * 100)) + '%';
    } else {
        bossHpContainer.style.display = 'none';
    }
}
