function animate(currentTime = 0) { 
    requestAnimationFrame(animate); 
    
    let deltaTime = 0;
    if (lastTime) {
        deltaTime = (currentTime - lastTime) / 1000;
    }
    
    // 【修正：限制 deltaTime 最大值】
    // 防止切換瀏覽器分頁後，產生過大的時間差導致實體瞬移出畫面
    if (deltaTime > 0.1) {
        deltaTime = 0.1;
    }
    
    lastTime = currentTime;
    
    if (gameActive && gameStarted && !isPaused) {
        update(deltaTime); 
    }
    
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

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

window.addEventListener('resize', () => { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
});

// 初始化 UI
updateChapterUI(); 
updateUpgradeUI(); 
updateBestStats(); 
requestAnimationFrame(animate);