// 棱鏡頭目 - 隨機出招的雷射系Boss
const PrismBoss = (function() {
    // 雷射傷害計算基礎值（會受難度倍率影響）
    const LASER_BASE_DAMAGE = 35;
    // 旋轉雷射傷害間隔（毫秒）
    const ROTATING_LASER_DAMAGE_INTERVAL = 300;
    // 頭目與玩家期望的距離（像素）
    const DESIRED_DISTANCE = 350;
    // 移動速度（像素/秒）
    const MOVE_SPEED = 120;

    // 攻擊模式
    const STATE = {
        IDLE: 'idle',               // 閒置
        PREPARE_NORMAL: 'prepare_normal',   // 普通攻擊預警（追蹤）
        LOCKED_NORMAL: 'locked_normal',     // 普通攻擊鎖定（固定角度，等待發射）
        FIRING_NORMAL: 'firing_normal',     // 普通攻擊發射中
        PREPARE_SPECIAL: 'prepare_special', // 特殊攻擊預警
        FIRING_SPECIAL: 'firing_special',   // 特殊攻擊發射中
        COOLDOWN: 'cooldown'        // 冷卻
    };

    // 初始化頭目
    function init(enemy, options, data) {
        enemy.attackState = STATE.IDLE;
        enemy.attackTimer = 0;
        enemy.cooldownRemaining = 0;
        enemy.lastRotatingDamageTime = 0;
        enemy.rotatingLasers = [];     // 旋轉雷射 { angle, active }
        enemy.activeLasers = [];        // 當前活動的雷射效果
        
        // 紀錄上次血量百分比，用於觸發血量門檻
        enemy.lastHpPercent = 1.0;
        
        // 設定頭目不移動（初始），實際移動邏輯在 update 中處理
        enemy.speed = 0;
        
        // 隨機選擇下一次攻擊類型（0:普通, 1:特殊）
        enemy.nextAttackIsSpecial = false;
        
        // 標記是否已觸發血量門檻特效（避免重複添加）
        enemy.rotatingLaserTriggered70 = false;
        enemy.rotatingLaserTriggered30 = false;
        
        // 設定頭目名稱
        enemy.name = '棱鏡';
    }
// 更新旋轉雷射（根據血量觸發）
function updateRotatingLasers(enemy, now, finalMult, timeMult) {
    const hpPercent = enemy.currentHp / enemy.maxHp;
    
    // 血量低於70%且尚未觸發 -> 添加兩條旋轉雷射（對稱）
    if (hpPercent <= 0.7 && !enemy.rotatingLaserTriggered70) {
        enemy.rotatingLaserTriggered70 = true;
        // 第一條隨機角度
        const angle1 = Math.random() * Math.PI * 2;
        // 第二條與第一條相差180度
        const angle2 = (angle1 + Math.PI) % (Math.PI * 2);
        enemy.rotatingLasers.push({ angle: angle1, active: true });
        enemy.rotatingLasers.push({ angle: angle2, active: true });
    }
    
    // 血量低於30%且尚未觸發第二階段 -> 再添加兩條，與現有兩條交錯（每90度一條）
    if (hpPercent <= 0.3 && !enemy.rotatingLaserTriggered30 && enemy.rotatingLasers.length >= 2) {
        enemy.rotatingLaserTriggered30 = true;
        // 獲取現有兩條的角度
        const angle1 = enemy.rotatingLasers[0].angle;
        const angle2 = enemy.rotatingLasers[1].angle;
        // 新角度與現有角度相差90度（取中點）
        const angle3 = (angle1 + Math.PI / 2) % (Math.PI * 2);
        const angle4 = (angle2 + Math.PI / 2) % (Math.PI * 2);
        enemy.rotatingLasers.push({ angle: angle3, active: true });
        enemy.rotatingLasers.push({ angle: angle4, active: true });
    }
}
    function updateRotatingLasersWithDt(enemy, dt, now, finalMult, timeMult) {
        if (enemy.rotatingLasers.length === 0) return;
        
        const rotationSpeed = 0.8; // 弧度/秒
        const deltaAngle = rotationSpeed * dt;
        
        for (let laser of enemy.rotatingLasers) {
            laser.angle = (laser.angle + deltaAngle) % (Math.PI * 2);
        }
        
        // 傷害判定
        if (now - enemy.lastRotatingDamageTime >= ROTATING_LASER_DAMAGE_INTERVAL) {
            enemy.lastRotatingDamageTime = now;
            
            // 計算雷射傷害基礎值
            let damage = LASER_BASE_DAMAGE * finalMult * timeMult;
            
            // 檢查玩家是否被任何一條旋轉雷射擊中
            for (let laser of enemy.rotatingLasers) {
                if (!laser.active) continue;
                
                // 計算從頭目位置出發、角度為laser.angle的射線
                const dirX = Math.cos(laser.angle);
                const dirY = Math.sin(laser.angle);
                const bossX = enemy.x;
                const bossY = enemy.y;
                
                // 玩家位置
                const playerX = player.x;
                const playerY = player.y;
                
                // 計算玩家到射線的距離
                const dx = playerX - bossX;
                const dy = playerY - bossY;
                const proj = dx * dirX + dy * dirY;
                const distSq = (dx*dx + dy*dy) - proj*proj;
                // 如果投影為正（在射線前方）且距離小於玩家半徑+雷射半徑
                if (proj > 0 && distSq < (player.size/2 + 8) * (player.size/2 + 8)) {
                    player.hp -= damage;
                    if (player.hp <= 0 && gameStarted) handleEndGame(false, false);
                    break; // 一次傷害間隔只扣一次血
                }
            }
        }
    }

    // 開始普通攻擊（追蹤雷射）
    function startNormalAttack(enemy, now, player, finalMult, timeMult) {
        // 判斷是否為三連發模式（血量低於50%）
        const isTriple = (enemy.currentHp / enemy.maxHp) <= 0.5;
        
        // 記錄預警開始時間和目標角度
        enemy.prepareStartTime = now;
        enemy.normalAttackTriple = isTriple;
        
        if (isTriple) {
            // 三連發：追蹤玩家當前方向，並加上±15度偏移
            const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.prepareAngles = [
                angleToPlayer,
                angleToPlayer + Math.PI / 12,   // 15度
                angleToPlayer - Math.PI / 12
            ];
        } else {
            // 單發：追蹤玩家方向
            enemy.prepareAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        }
        
        enemy.attackState = STATE.PREPARE_NORMAL;
        enemy.attackTimer = now + 500; // 0.5秒預警
    }
    
    // 開始特殊攻擊（井字形雷射）
    function startSpecialAttack(enemy, now, player, finalMult, timeMult) {
        // 井字形雷射：以玩家位置為中心，生成水平和垂直方向的兩組雷射
        // 每組包含三條線，形成井字狀
        const playerCenterX = player.x;
        const playerCenterY = player.y;
        const offset = 40; // 井字間距
        
        enemy.specialLasers = [];
        // 水平線：y = playerCenterY - offset, playerCenterY, playerCenterY + offset
        // 垂直線：x = playerCenterX - offset, playerCenterX, playerCenterX + offset
        const horizontalYs = [playerCenterY - offset, playerCenterY + offset];
        const verticalXs = [playerCenterX - offset, playerCenterX + offset];
        
        // 儲存線條定義 { type: 'h', y, xStart, xEnd } 或 { type: 'v', x, yStart, yEnd }
        // 範圍為整個畫布
        for (let y of horizontalYs) {
            enemy.specialLasers.push({
                type: 'h',
                y: y,
                xStart: 0,
                xEnd: canvas.width,
                active: true
            });
        }
        for (let x of verticalXs) {
            enemy.specialLasers.push({
                type: 'v',
                x: x,
                yStart: 0,
                yEnd: canvas.height,
                active: true
            });
        }
        
        enemy.attackState = STATE.FIRING_SPECIAL;
        enemy.attackTimer = now + 1500; // 持續1.5秒
    }
    
    // 處理普通攻擊的預警、鎖定、發射
    function updateNormalAttack(enemy, now, dt, finalMult, timeMult) {
        if (enemy.attackState === STATE.PREPARE_NORMAL) {
            // 預警階段：更新目標角度（追蹤玩家）
            if (enemy.normalAttackTriple) {
                const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.prepareAngles = [
                    angleToPlayer,
                    angleToPlayer + Math.PI / 12,
                    angleToPlayer - Math.PI / 12
                ];
            } else {
                enemy.prepareAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            }
            
            // 檢查預警是否結束
            if (now >= enemy.attackTimer) {
                // 進入鎖定階段（固定角度，停留0.3秒）
                enemy.attackState = STATE.LOCKED_NORMAL;
                enemy.attackTimer = now + 300; // 停留0.3秒
                // 鎖定當前的角度（已經是最新追蹤角度）
                // 如果是三連發，則將當前三個角度儲存為鎖定角度
                if (enemy.normalAttackTriple) {
                    // 此時 enemy.prepareAngles 已經是最新追蹤角度
                    enemy.lockedAngles = [...enemy.prepareAngles];
                } else {
                    enemy.lockedAngle = enemy.prepareAngle;
                }
            }
        } else if (enemy.attackState === STATE.LOCKED_NORMAL) {
            // 鎖定階段：不追蹤，固定角度等待發射
            if (now >= enemy.attackTimer) {
                // 進入發射階段
                enemy.attackState = STATE.FIRING_NORMAL;
                enemy.attackTimer = now + 1000; // 持續1秒
                
                // 創建雷射效果（根據單發/三發）
                enemy.activeLasers = [];
                if (enemy.normalAttackTriple) {
                    for (let angle of enemy.lockedAngles) {
                        enemy.activeLasers.push({
                            type: 'normal',
                            angle: angle,
                            startTime: now,
                            duration: 1000,
                            damage: LASER_BASE_DAMAGE * finalMult * timeMult
                        });
                    }
                } else {
                    enemy.activeLasers.push({
                        type: 'normal',
                        angle: enemy.lockedAngle,
                        startTime: now,
                        duration: 1000,
                        damage: LASER_BASE_DAMAGE * finalMult * timeMult
                    });
                }
            }
        } else if (enemy.attackState === STATE.FIRING_NORMAL) {
            // 發射階段：處理雷射傷害
            for (let i = enemy.activeLasers.length-1; i >= 0; i--) {
                const laser = enemy.activeLasers[i];
                if (now - laser.startTime >= laser.duration) {
                    enemy.activeLasers.splice(i,1);
                    continue;
                }
                
                // 傷害判定：從頭目位置沿角度發射的射線
                const dirX = Math.cos(laser.angle);
                const dirY = Math.sin(laser.angle);
                const bossX = enemy.x;
                const bossY = enemy.y;
                const playerX = player.x;
                const playerY = player.y;
                
                const dx = playerX - bossX;
                const dy = playerY - bossY;
                const proj = dx * dirX + dy * dirY;
                const distSq = (dx*dx + dy*dy) - proj*proj;
                
                // 如果投影為正且距離小於玩家半徑+雷射半徑
                if (proj > 0 && distSq < (player.size/2 + 8) * (player.size/2 + 8)) {
                    // 每幀傷害，但為避免過高，限制每秒最多傷害2次
                    if (!laser.lastDamageTime || now - laser.lastDamageTime >= 500) {
                        laser.lastDamageTime = now;
                        player.hp -= laser.damage;
                        if (player.hp <= 0 && gameStarted) handleEndGame(false, false);
                    }
                }
            }
            
            // 檢查是否結束
            if (now >= enemy.attackTimer) {
                enemy.attackState = STATE.COOLDOWN;
                enemy.attackTimer = now + 2000; // 後搖2秒
                enemy.activeLasers = [];
            }
        }
    }
    
    // 處理特殊攻擊（井字形雷射）
    function updateSpecialAttack(enemy, now, dt, finalMult, timeMult) {
        if (enemy.attackState === STATE.FIRING_SPECIAL) {
            // 傷害判定：檢查玩家是否在任何一條井字雷射上
            const laserDamage = LASER_BASE_DAMAGE * finalMult * timeMult;
            
            for (let laser of enemy.specialLasers) {
                if (!laser.active) continue;
                
                let hit = false;
                if (laser.type === 'h') {
                    // 水平線：玩家Y座標接近線條Y
                    if (Math.abs(player.y - laser.y) < player.size/2 + 5) {
                        hit = true;
                    }
                } else if (laser.type === 'v') {
                    // 垂直線：玩家X座標接近線條X
                    if (Math.abs(player.x - laser.x) < player.size/2 + 5) {
                        hit = true;
                    }
                }
                
                if (hit) {
                    if (!laser.lastDamageTime || now - laser.lastDamageTime >= 500) {
                        laser.lastDamageTime = now;
                        player.hp -= laserDamage;
                        if (player.hp <= 0 && gameStarted) handleEndGame(false, false);
                    }
                    break; // 一次傷害間隔只扣一次血
                }
            }
            
            // 檢查是否結束
            if (now >= enemy.attackTimer) {
                enemy.attackState = STATE.COOLDOWN;
                enemy.attackTimer = now + 2000; // 後搖2秒
                enemy.specialLasers = [];
            }
        }
    }
    
    // 頭目移動邏輯：保持與玩家距離（類似狙擊手）
    function updateMovement(enemy, playerObj, dt) {
        // 只有在非攻擊狀態（IDLE 或 COOLDOWN）時才移動
        if (enemy.attackState !== STATE.IDLE && enemy.attackState !== STATE.COOLDOWN) {
            return;
        }
        
        const dx = playerObj.x - enemy.x;
        const dy = playerObj.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 0.01) return;
        
        // 計算朝向玩家的單位向量
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // 如果距離小於期望距離，則遠離玩家（反向移動）
        // 如果距離大於期望距離，則靠近玩家（但通常頭目會保持距離，我們也允許靠近）
        // 這裡簡單實現：總是試圖保持距離為 DESIRED_DISTANCE
        let moveDirX, moveDirY;
        if (distance < DESIRED_DISTANCE) {
            // 遠離玩家
            moveDirX = -dirX;
            moveDirY = -dirY;
        } else {
            // 靠近玩家
            moveDirX = dirX;
            moveDirY = dirY;
        }
        
        // 移動速度，距離越遠移動越快（但有限制）
        let speed = MOVE_SPEED * dt;
        // 如果距離與期望差距很大，可以略微加速（可選）
        const diff = Math.abs(distance - DESIRED_DISTANCE);
        if (diff > 100) {
            speed *= 1.5;
        }
        
        let newX = enemy.x + moveDirX * speed;
        let newY = enemy.y + moveDirY * speed;
        
        // 邊界限制，避免超出畫布
        const halfSize = enemy.size / 2;
        newX = Math.max(halfSize, Math.min(canvas.width - halfSize, newX));
        newY = Math.max(halfSize, Math.min(canvas.height - halfSize, newY));
        
        enemy.x = newX;
        enemy.y = newY;
    }
    
    // 主更新函數
    function update(enemy, playerObj, dt, now, finalMult, timeMult, dx, dy, dist) {
        if (enemy.isDead) return;
        
        // 更新移動
        updateMovement(enemy, playerObj, dt);
        
        // 更新旋轉雷射（血量門檻觸發）
        updateRotatingLasers(enemy, now, finalMult, timeMult);
        updateRotatingLasersWithDt(enemy, dt, now, finalMult, timeMult);
        
        // 攻擊冷卻與狀態機
        if (enemy.attackState === STATE.IDLE) {
            // 閒置狀態，隨機選擇下一次攻擊
            if (!enemy.cooldownRemaining || enemy.cooldownRemaining <= now) {
                // 隨機選擇攻擊類型（70%普通，30%特殊）
                const isSpecial = Math.random() < 0.3;
                if (isSpecial) {
                    startSpecialAttack(enemy, now, playerObj, finalMult, timeMult);
                } else {
                    startNormalAttack(enemy, now, playerObj, finalMult, timeMult);
                }
            }
        } else if (enemy.attackState === STATE.COOLDOWN) {
            // 冷卻狀態
            if (now >= enemy.attackTimer) {
                enemy.attackState = STATE.IDLE;
                enemy.cooldownRemaining = null;
            }
        } else if (enemy.attackState === STATE.PREPARE_NORMAL || 
                   enemy.attackState === STATE.LOCKED_NORMAL || 
                   enemy.attackState === STATE.FIRING_NORMAL) {
            updateNormalAttack(enemy, now, dt, finalMult, timeMult);
        } else if (enemy.attackState === STATE.FIRING_SPECIAL) {
            updateSpecialAttack(enemy, now, dt, finalMult, timeMult);
        }
    }
// 繪製函數
function draw(enemy, ctx, now) {
    if (enemy.isDead) return;
    
    // 輔助函數：繪製多層漸變雷射（從外層彩色平滑過渡到內層白色）
    const drawLaser = (x1, y1, x2, y2, outerColor, innerColor, maxWidth = 10, minWidth = 2) => {
        // 將顏色轉換為 rgba 數組（支持 #RRGGBB 和 rgb/rgba 格式）
        const parseColor = (color) => {
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1,3), 16);
                const g = parseInt(color.slice(3,5), 16);
                const b = parseInt(color.slice(5,7), 16);
                return [r, g, b];
            } else if (color.startsWith('rgb')) {
                const matches = color.match(/\d+/g);
                if (matches && matches.length >= 3) {
                    return [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])];
                }
            }
            return [255, 255, 255]; // fallback
        };
        
        const outerRGB = parseColor(outerColor);
        const innerRGB = [255, 255, 255]; // 內層始終為白色
        
        // 繪製 5 層，從外到內寬度遞減，顏色漸變
        const layers = 5;
        for (let i = 0; i < layers; i++) {
            const t = i / (layers - 1); // 0 = 外層, 1 = 內層
            // 線寬從 maxWidth 線性減小到 minWidth
            const width = maxWidth - (maxWidth - minWidth) * t;
            // 顏色混合：外層 color → 內層白色
            const r = Math.floor(outerRGB[0] * (1 - t) + innerRGB[0] * t);
            const g = Math.floor(outerRGB[1] * (1 - t) + innerRGB[1] * t);
            const b = Math.floor(outerRGB[2] * (1 - t) + innerRGB[2] * t);
            // 透明度也逐漸增加（內層更亮更實）
            const alpha = 0.5 + t * 0.5; // 從 0.5 到 1.0
            const color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        }
    };
    
    // 繪製預警線（普通攻擊預警階段）
    if (enemy.attackState === STATE.PREPARE_NORMAL) {
        if (enemy.normalAttackTriple) {
            for (let angle of enemy.prepareAngles) {
                const endX = enemy.x + Math.cos(angle) * 2000;
                const endY = enemy.y + Math.sin(angle) * 2000;
                drawLaser(enemy.x, enemy.y, endX, endY, '#ff5050', '#ffffff', 6, 2);
            }
        } else {
            const endX = enemy.x + Math.cos(enemy.prepareAngle) * 2000;
            const endY = enemy.y + Math.sin(enemy.prepareAngle) * 2000;
            drawLaser(enemy.x, enemy.y, endX, endY, '#ff5050', '#ffffff', 6, 2);
        }
        ctx.setLineDash([]);
    }
    
    // 繪製鎖定階段（固定紅色實線，表示即將發射）
    if (enemy.attackState === STATE.LOCKED_NORMAL) {
        if (enemy.normalAttackTriple) {
            for (let angle of enemy.lockedAngles) {
                const endX = enemy.x + Math.cos(angle) * 2000;
                const endY = enemy.y + Math.sin(angle) * 2000;
                drawLaser(enemy.x, enemy.y, endX, endY, '#ff3300', '#ffffff', 10, 3);
            }
        } else {
            const endX = enemy.x + Math.cos(enemy.lockedAngle) * 2000;
            const endY = enemy.y + Math.sin(enemy.lockedAngle) * 2000;
            drawLaser(enemy.x, enemy.y, endX, endY, '#ff3300', '#ffffff', 10, 3);
        }
    }
    
    // 繪製活動中的普通雷射（發射階段）
    if (enemy.activeLasers) {
        for (let laser of enemy.activeLasers) {
            if (laser.type === 'normal') {
                const endX = enemy.x + Math.cos(laser.angle) * 2000;
                const endY = enemy.y + Math.sin(laser.angle) * 2000;
                drawLaser(enemy.x, enemy.y, endX, endY, '#ff0000', '#ffffff', 12, 4);
            }
        }
    }
    
    // 繪製特殊攻擊（井字形雷射）
    if (enemy.specialLasers) {
        ctx.save();
        for (let laser of enemy.specialLasers) {
            if (laser.type === 'h') {
                const x1 = laser.xStart;
                const y1 = laser.y;
                const x2 = laser.xEnd;
                const y2 = laser.y;
                drawLaser(x1, y1, x2, y2, '#ff8800', '#ffffff', 10, 3);
            } else if (laser.type === 'v') {
                const x1 = laser.x;
                const y1 = laser.yStart;
                const x2 = laser.x;
                const y2 = laser.yEnd;
                drawLaser(x1, y1, x2, y2, '#ff8800', '#ffffff', 10, 3);
            }
        }
        ctx.restore();
    }
    
    // 繪製旋轉雷射
    if (enemy.rotatingLasers) {
        for (let laser of enemy.rotatingLasers) {
            if (!laser.active) continue;
            const endX = enemy.x + Math.cos(laser.angle) * 2000;
            const endY = enemy.y + Math.sin(laser.angle) * 2000;
            drawLaser(enemy.x, enemy.y, endX, endY, '#ff44ff', '#ffffff', 10, 3);
        }
    }
}
    return {
        init: init,
        update: update,
        draw: draw
    };
})();