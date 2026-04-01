function animate(currentTime = 0) { 
    requestAnimationFrame(animate); 
    let deltaTime = 0;
    if (lastTime) {
        deltaTime = (currentTime - lastTime) / 1000;
    }
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
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth; 
    canvas.height = canvasHeight; 
    if (player && player.x) {
        player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
        player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
    }
});
let joystickBaseRect = null;
function updateJoystickKnob(x, y) {
    joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}
function handleTouch(touch) {
    if (!joystickBaseRect) return;
    const centerX = joystickBaseRect.left + joystickBaseRect.width / 2;
    const centerY = joystickBaseRect.top + joystickBaseRect.height / 2;
    const maxRadius = joystickBaseRect.width / 2; 
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
    }
    updateJoystickKnob(dx, dy);
    joystick.active = true;
    joystick.dx = dx / maxRadius;
    joystick.dy = dy / maxRadius;
}
const endTouch = () => {
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    updateJoystickKnob(0, 0);
};
joystickArea.addEventListener('touchstart', e => {
    e.preventDefault();
    joystickBaseRect = joystickBase.getBoundingClientRect();
    handleTouch(e.touches[0]);
}, { passive: false });
joystickArea.addEventListener('touchmove', e => {
    e.preventDefault();
    handleTouch(e.touches[0]);
}, { passive: false });
joystickArea.addEventListener('touchend', endTouch);
joystickArea.addEventListener('touchcancel', endTouch);
updateChapterUI(); 
updateUpgradeUI(); 
updateBestStats(); 
updateTrialUI(); // 確保載入時更新試煉等級 UI
requestAnimationFrame(animate);
