const GravityBoss = {
    init: function(enemy, options, data) {
        enemy.color = '#8A2BE2'; // 紫色
        enemy.lastAttack = 0;
        enemy.gravityCooldown = Date.now() + 5000; // 開場5秒後首次發動
        enemy.gravityEndTime = 0;
        enemy.name = '重力';
        
        // 確保玩家擁有重力狀態物件
        player.gravityState = {
            active: false,
            wall: null, // 'top', 'bottom', 'left', 'right'
            vel: 0,
            isJumping: false,
            jumpTimer: 0
        };

        // 雷射與階段狀態機
        enemy.laserState = 'idle'; // 'idle', 'tracking', 'locked', 'firing'
        enemy.laserTimer = 0;
        enemy.laserPos = 0; 
        enemy.laserAxis = 'y'; // 'y'為水平雷射，'x'為垂直雷射
        
        // 第三階段 (小於 35%) 的專屬變數
        enemy.isPhase3 = false;
        enemy.blueCubeWaveCount = 0; // 紀錄藍色方塊波數
        enemy.perpLaserAxis = 'x';
        enemy.perpLaserPos1 = 0;
        enemy.perpLaserPos2 = 0;
    },

    update: function(en, player, dt, now, finalMult, timeMult, dx, dy, dist) {
        const wallAngles = { 'right': 0, 'bottom': Math.PI / 2, 'left': Math.PI, 'top': -Math.PI / 2 };
        
        const isPhase2 = en.currentHp <= en.maxHp * 0.5;
        en.isPhase3 = en.currentHp <= en.maxHp * 0.35;

        // 1. 普攻邏輯：發射 3 顆小方塊（大於50%紫色，小於等於50%藍色）
        // 必須放在重力判定前，因為要計算藍方塊波數來觸發三階重力
        if (now - en.lastAttack > 2000) {
            en.lastAttack = now;
            
            if (isPhase2) {
                en.blueCubeWaveCount++; // 累加藍方塊波數
            }

            const baseAngle = Math.atan2(dy, dx);
            const angles = [baseAngle, baseAngle - 0.35, baseAngle + 0.35];
            const trackingCoefs = [0.4, 0.2, 0.2];

            for (let i = 0; i < 3; i++) {
                if (isPhase2) {
                    // 二階段以上：藍色方塊
                    enemyProjectiles.push({
                        x: en.x, y: en.y,
                        vx: Math.cos(angles[i]) * 6, vy: Math.sin(angles[i]) * 6,
                        type: 'gravity_blue_cube',
                        color: '#00BFFF',
                        size: 15,
                        damage: 15 * finalMult * timeMult,
                        speed: 6, 
                        spawnTime: now,
                        trackingAccel: trackingCoefs[i],
                        blueState: 'tracking',
                        stateTimer: now + 1750, // 追蹤 1.75 秒
                        cubeIndex: i 
                    });
                } else {
                    // 一階段：紫色方塊
                    enemyProjectiles.push({
                        x: en.x, y: en.y,
                        vx: Math.cos(angles[i]) * 5, vy: Math.sin(angles[i]) * 5,
                        type: 'gravity_cube',
                        color: '#9400D3',
                        size: 15,
                        damage: 15 * finalMult * timeMult,
                        speed: 5, 
                        spawnTime: now,
                        trackingAccel: trackingCoefs[i] 
                    });
                }
            }
        }

        // 2. 重力技能觸發邏輯
        let triggerGravity = false;
        
        if (!en.isPhase3) {
            // 第一、二階段：依賴時間冷卻 (20秒發動一次)
            if (now > en.gravityCooldown && !player.gravityState.active) {
                triggerGravity = true;
            }
        } else {
            // 第三階段：每 2 波藍方塊發動一次 (取代時間冷卻)
            if (en.blueCubeWaveCount >= 2) {
                triggerGravity = true;
                en.blueCubeWaveCount = 0; // 重置波數
            }
        }

        if (triggerGravity) {
            // 發動重力改變
            const walls = ['top', 'bottom', 'left', 'right'];
            player.gravityState.wall = walls[Math.floor(Math.random() * walls.length)];
            player.gravityState.active = true;
            player.gravityState.vel = 0;
            
            if (!en.isPhase3) {
                en.gravityEndTime = now + 5000; // 一二階：持續 5 秒
            }
            
            // 畫面提示：產生指向目標牆壁的 SVG 箭頭
            let arrowAngle = wallAngles[player.gravityState.wall];
            floatingTexts.push({ x: canvas.width / 2, y: canvas.height / 2, isArrow: true, angle: arrowAngle, life: 120 });

            // 啟動雷射攻擊
            en.laserState = 'tracking';
            en.laserTimer = now + 1500; // 追蹤瞄準 1.5 秒
            en.laserAxis = (player.gravityState.wall === 'left' || player.gravityState.wall === 'right') ? 'x' : 'y';
            en.laserPos = (en.laserAxis === 'y') ? player.y : player.x;

            if (en.isPhase3) {
                // 三階額外追加：兩條垂直於牆壁 (平行於掉落方向) 的雷射
                en.perpLaserAxis = (en.laserAxis === 'y') ? 'x' : 'y';
                let playerPerpPos = (en.perpLaserAxis === 'y') ? player.y : player.x;
                // 距離玩家 200 像素的間隔
                en.perpLaserPos1 = playerPerpPos - 200; 
                en.perpLaserPos2 = playerPerpPos + 200; 
            }
        }

        // 一二階重力結束邏輯 (三階重力為永久，直到下一次改變方向)
        if (!en.isPhase3 && player.gravityState.active && now > en.gravityEndTime) {
            // 恢復提示：產生反方向的 SVG 箭頭
            let restoreAngle = wallAngles[player.gravityState.wall] + Math.PI;
            floatingTexts.push({ x: canvas.width / 2, y: canvas.height / 2, isArrow: true, angle: restoreAngle, life: 60 });

            player.gravityState.active = false;
            en.gravityCooldown = now + 20000; 
            en.laserState = 'idle';
        }

        // 3. 雷射狀態更新
        if (en.laserState !== 'idle') {
            if (en.laserState === 'tracking') {
                // 平滑追蹤玩家座標
                const targetPos = (en.laserAxis === 'y') ? player.y : player.x;
                en.laserPos += (targetPos - en.laserPos) * 8 * dt;

                if (en.isPhase3) {
                    const targetPerpPos = (en.perpLaserAxis === 'y') ? player.y : player.x;
                    en.perpLaserPos1 += ((targetPerpPos - 200) - en.perpLaserPos1) * 8 * dt;
                    en.perpLaserPos2 += ((targetPerpPos + 200) - en.perpLaserPos2) * 8 * dt;
                }

                if (now > en.laserTimer) {
                    en.laserState = 'locked';
                    en.laserTimer = now + 200; // 停頓 0.2 秒
                }
            } else if (en.laserState === 'locked') {
                if (now > en.laserTimer) {
                    en.laserState = 'firing';
                    en.laserTimer = now + 500; // 發射持續 0.5 秒
                }
            } else if (en.laserState === 'firing') {
                // 傷害判定
                let isHit = false;
                let laserThickness = 40; 
                
                // 判斷主雷射 (平行牆壁)
                let playerParallel = (en.laserAxis === 'y') ? player.y : player.x;
                if (Math.abs(playerParallel - en.laserPos) < (player.size / 2 + laserThickness / 2)) isHit = true;

                // 判斷三階副雷射 (垂直牆壁)
                if (en.isPhase3) {
                    let playerPerp = (en.perpLaserAxis === 'y') ? player.y : player.x;
                    if (Math.abs(playerPerp - en.perpLaserPos1) < (player.size / 2 + laserThickness / 2)) isHit = true;
                    if (Math.abs(playerPerp - en.perpLaserPos2) < (player.size / 2 + laserThickness / 2)) isHit = true;
                }

                if (isHit) {
                    player.hp -= (40 * finalMult * timeMult) * dt;
                    if (player.hp <= 0 && gameStarted) handleEndGame(false, false);
                }

                if (now > en.laserTimer) {
                    en.laserState = 'idle';
                }
            }
        }

        // 4. Boss 移動邏輯
        if (player.gravityState.active) {
            // 玩家在牆上，Boss 停止移動
        } else {
            // 不斷接近玩家
            if (dist > 0) {
                en.x += (dx / dist) * en.speed * (dt * 60);
                en.y += (dy / dist) * en.speed * (dt * 60);
            }
        }
    },

    // 處理玩家在重力狀態下的物理位移
    applyPlayerPhysics: function(p, dt, keys, joystick) {
        const gravityAcc = 2500; // 掉落加速度
        const jumpInitial = -600; // 起跳初速
        const jumpHoldAcc = -2000; // 按住時的額外上升力
        const moveSpeed = p.speed * (dt * 60);
        
        let wall = p.gravityState.wall;
        let jumpInput = false;
        let latMove = 0; // 側向移動

        // 判斷跳躍與側向輸入
        if (wall === 'bottom') {
            jumpInput = keys['w'] || keys['ArrowUp'] || (joystick.active && joystick.dy < -0.5);
            if (keys['a'] || keys['ArrowLeft'] || (joystick.active && joystick.dx < 0)) latMove = -moveSpeed;
            if (keys['d'] || keys['ArrowRight'] || (joystick.active && joystick.dx > 0)) latMove = moveSpeed;
        } else if (wall === 'top') {
            jumpInput = keys['s'] || keys['ArrowDown'] || (joystick.active && joystick.dy > 0.5);
            if (keys['a'] || keys['ArrowLeft'] || (joystick.active && joystick.dx < 0)) latMove = -moveSpeed;
            if (keys['d'] || keys['ArrowRight'] || (joystick.active && joystick.dx > 0)) latMove = moveSpeed;
        } else if (wall === 'left') {
            jumpInput = keys['d'] || keys['ArrowRight'] || (joystick.active && joystick.dx > 0.5);
            if (keys['w'] || keys['ArrowUp'] || (joystick.active && joystick.dy < 0)) latMove = -moveSpeed;
            if (keys['s'] || keys['ArrowDown'] || (joystick.active && joystick.dy > 0)) latMove = moveSpeed;
        } else if (wall === 'right') {
            jumpInput = keys['a'] || keys['ArrowLeft'] || (joystick.active && joystick.dx < -0.5);
            if (keys['w'] || keys['ArrowUp'] || (joystick.active && joystick.dy < 0)) latMove = -moveSpeed;
            if (keys['s'] || keys['ArrowDown'] || (joystick.active && joystick.dy > 0)) latMove = moveSpeed;
        }

        // 判斷是否落地
        let isGrounded = false;
        if (wall === 'bottom') isGrounded = p.y >= canvas.height - p.size / 2;
        if (wall === 'top') isGrounded = p.y <= p.size / 2;
        if (wall === 'left') isGrounded = p.x <= p.size / 2;
        if (wall === 'right') isGrounded = p.x >= canvas.width - p.size / 2;

        // 施加重力
        if (!isGrounded) {
            p.gravityState.vel += gravityAcc * dt;
        } else if (p.gravityState.vel > 0) {
            p.gravityState.vel = 0; // 撞擊牆壁後停下
        }

        // 跳躍邏輯
        if (isGrounded && jumpInput) {
            p.gravityState.isJumping = true;
            p.gravityState.jumpTimer = 0.25; // 最多按住0.25秒增加高度
            p.gravityState.vel = jumpInitial;
        }

        if (p.gravityState.isJumping && jumpInput && p.gravityState.jumpTimer > 0) {
            p.gravityState.vel += jumpHoldAcc * dt;
            p.gravityState.jumpTimer -= dt;
        } else {
            p.gravityState.isJumping = false;
        }

        // 套用位移
        let dPos = p.gravityState.vel * dt;
        
        if (wall === 'bottom') { p.y += dPos; p.x += latMove; }
        if (wall === 'top') { p.y -= dPos; p.x += latMove; }
        if (wall === 'left') { p.x -= dPos; p.y += latMove; }
        if (wall === 'right') { p.x += dPos; p.y += latMove; }

        // 邊界限制
        p.x = Math.max(p.size / 2, Math.min(canvas.width - p.size / 2, p.x));
        p.y = Math.max(p.size / 2, Math.min(canvas.height - p.size / 2, p.y));
    },

    // 繪製雷射特效
    draw: function(en, ctx, now) {
        if (en.laserState === 'idle') return;

        // 繪製單一條雷射的輔助函數
        const drawLaserLine = (axis, pos, state) => {
            let x1, y1, x2, y2;
            if (axis === 'y') {
                x1 = 0; x2 = canvas.width;
                y1 = pos; y2 = pos;
            } else {
                x1 = pos; x2 = pos;
                y1 = 0; y2 = canvas.height;
            }

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);

            if (state === 'tracking') {
                ctx.strokeStyle = 'rgba(148, 0, 211, 0.5)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.stroke();
            } else if (state === 'locked') {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // 鎖定時轉為紅色警告
                ctx.lineWidth = 6;
                ctx.setLineDash([]);
                ctx.stroke();
            } else if (state === 'firing') {
                ctx.strokeStyle = 'rgba(148, 0, 211, 0.9)'; // 發射粗壯的雷射
                ctx.lineWidth = 40;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#9400D3';
                ctx.setLineDash([]);
                ctx.stroke();

                // 發射時的白熱核心
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 15;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }
        };

        ctx.save();
        // 繪製主雷射
        drawLaserLine(en.laserAxis, en.laserPos, en.laserState);
        // 若為第三階段，繪製額外兩條雷射
        if (en.isPhase3) {
            drawLaserLine(en.perpLaserAxis, en.perpLaserPos1, en.laserState);
            drawLaserLine(en.perpLaserAxis, en.perpLaserPos2, en.laserState);
        }
        ctx.restore();
    }
};