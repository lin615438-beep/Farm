// Husky Companion AI System
// 負責哈士奇的陪伴 AI、心情、飽足感、挖寶、撿球與互動

class HuskyCompanion {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.targetX = startX;
        this.targetY = startY;

        this.speed = 110;
        this.facingLeft = false;
        this.state = 'idle'; // 'idle', 'walking', 'running', 'digging', 'begging', 'sleeping', 'fetch'
        
        // 數值屬性
        this.happiness = 85; // 0 ~ 100 心情
        this.hunger = 80;    // 0 ~ 100 飽足感 (會逐漸消耗)
        this.affection = 1;  // 親密等級 (1 ~ 10)
        this.affectionExp = 0;

        // 狀態計時器
        this.stateTimer = 0;
        this.digTimer = 0;
        this.dialogue = '';
        this.dialogueTimer = 0;
        this.isCarryingBall = false;

        // 隨機行為冷卻
        this.randomActionCooldown = 5 + Math.random() * 5;
    }

    say(text, duration = 3.5) {
        this.dialogue = text;
        this.dialogueTimer = duration;
    }

    feed(foodName, hungerValue = 30, happyValue = 20) {
        this.hunger = Math.min(100, this.hunger + hungerValue);
        this.happiness = Math.min(100, this.happiness + happyValue);
        this.addAffection(15);
        this.say(`好吃汪！最喜歡【${foodName}】了♥`, 3);
        if (window.soundEngine) {
            window.soundEngine.playHeart();
            window.soundEngine.playBark(true);
        }
    }

    pet() {
        this.happiness = Math.min(100, this.happiness + 15);
        this.addAffection(10);
        const cName = (window.adminManager && window.adminManager.config.corgiName) || '魯尼';
        const dialogues = [
            `呼嚕嚕～${cName}摸摸最舒服了♥`,
            `汪！最喜歡${cName}了！(瘋狂搖尾巴)`,
            "好幸福汪～摸下巴好爽！",
            `${cName}的天使光環今天也閃閃發亮呢汪！`
        ];
        this.say(dialogues[Math.floor(Math.random() * dialogues.length)], 3);
        if (window.soundEngine) {
            window.soundEngine.playHeart();
        }
    }

    addAffection(exp) {
        this.affectionExp += exp;
        const required = this.affection * 50;
        if (this.affectionExp >= required) {
            this.affectionExp -= required;
            this.affection++;
            const dName = (window.adminManager && window.adminManager.config.dogName) || '哈士祈';
            this.say(`🌟 親密度提升到 Lv.${this.affection}！${dName}更愛你了！`, 4);
            if (window.soundEngine) window.soundEngine.playHarvest();
        }
    }

    // 接收丟球目標
    chaseBall(ballX, ballY) {
        this.state = 'fetch';
        this.targetX = ballX;
        this.targetY = ballY;
        this.say("球球！我去撿！汪！", 2);
        if (window.soundEngine) window.soundEngine.playBark(true);
    }

    update(dt, playerX, playerY, farmManager) {
        // 飽足感與心情自然衰減
        this.hunger = Math.max(0, this.hunger - dt * 0.4);
        if (this.hunger < 25) {
            this.happiness = Math.max(0, this.happiness - dt * 0.6);
        }

        // 對話氣泡倒數
        if (this.dialogueTimer > 0) {
            this.dialogueTimer -= dt;
            if (this.dialogueTimer <= 0) {
                this.dialogue = '';
            }
        }

        // 飢餓提示
        if (this.hunger < 20 && !this.dialogue && Math.random() < 0.02) {
            this.say("肚子咕嚕嚕好餓...想吃肉肉或骨頭汪～", 3);
            if (window.soundEngine) window.soundEngine.playBark(false);
        }

        const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);

        // 狀態機行為邏輯
        switch (this.state) {
            case 'fetch': {
                // 衝去撿球
                const distToBall = Math.hypot(this.targetX - this.x, this.targetY - this.y);
                if (distToBall > 12) {
                    this.moveTowards(this.targetX, this.targetY, this.speed * 1.5, dt);
                } else {
                    const cName = (window.adminManager && window.adminManager.config.corgiName) || '魯尼';
                    this.isCarryingBall = true;
                    this.state = 'running';
                    this.targetX = playerX;
                    this.targetY = playerY;
                    this.say(`撿到了！帶回來給${cName}汪！`, 2.5);
                    if (window.soundEngine) window.soundEngine.playHeart();
                }
                break;
            }

            case 'digging': {
                this.digTimer -= dt;
                // 噴土微粒
                if (Math.random() < 0.35 && farmManager) {
                    farmManager.addParticle(this.x, this.y + 12, 'text', '🐾', '#8D6E63');
                }

                if (this.digTimer <= 0) {
                    // 挖寶完成！獲得獎勵
                    this.state = 'idle';
                    const roll = Math.random();
                    let rewardCoin = 10;
                    if (roll < 0.4) {
                        rewardCoin = Math.floor(Math.random() * 15) + 10;
                        this.say(`✨ 挖到了 ${rewardCoin} 狗勾幣！厲害吧！`, 3.5);
                    } else if (roll < 0.75) {
                        rewardCoin = 8;
                        this.say("🦴 挖出了一根香噴噴的大骨頭！", 3.5);
                    } else {
                        rewardCoin = 25;
                        this.say("💎 天啊！挖到了閃閃發光的神秘寶石！", 4);
                    }

                    if (farmManager) {
                        farmManager.addParticle(this.x, this.y - 20, 'text', `+${rewardCoin} 幣!`, '#FFD700');
                    }
                    if (window.soundEngine) {
                        window.soundEngine.playCoin();
                        window.soundEngine.playBark(true);
                    }
                    // 回報給遊戲管理器
                    if (window.gameInstance) {
                        window.gameInstance.addCoins(rewardCoin);
                    }
                    this.randomActionCooldown = 12 + Math.random() * 8;
                }
                break;
            }

            case 'running':
            case 'walking': {
                // 攜球回來給柯基
                if (this.isCarryingBall) {
                    if (distToPlayer > 40) {
                        this.moveTowards(playerX, playerY, this.speed * 1.3, dt);
                    } else {
                        // 抵達柯基身邊，交付球球
                        this.isCarryingBall = false;
                        this.state = 'idle';
                        this.happiness = Math.min(100, this.happiness + 25);
                        this.addAffection(20);
                        this.say("好玩好玩！還要再玩拋球！汪♥", 3.5);
                        if (farmManager) {
                            farmManager.addParticle(this.x, this.y - 15, 'heart');
                        }
                    }
                    break;
                }

                // 普通跟隨或徘徊
                const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
                if (distToTarget > 15) {
                    this.moveTowards(this.targetX, this.targetY, this.speed, dt);
                } else {
                    this.state = 'idle';
                }
                break;
            }

            case 'idle':
            default: {
                // 如果天使柯基走遠了，主動跟上
                if (distToPlayer > 85) {
                    // 跟隨柯基 (留一點親暱距離)
                    const angle = Math.atan2(this.y - playerY, this.x - playerX);
                    this.targetX = playerX + Math.cos(angle) * 45;
                    this.targetY = playerY + Math.sin(angle) * 45;
                    this.state = 'walking';
                    break;
                }

                // 隨機行為 (挖地、打哈欠、撒嬌)
                this.randomActionCooldown -= dt;
                if (this.randomActionCooldown <= 0) {
                    this.randomActionCooldown = 8 + Math.random() * 10;
                    const act = Math.random();
                    if (act < 0.3) {
                        // 挖寶
                        this.state = 'digging';
                        this.digTimer = 2.5;
                        this.say("嗅嗅...底下好像有寶物！開挖！", 2.5);
                        if (window.soundEngine) window.soundEngine.playTill();
                    } else if (act < 0.6) {
                        // 在柯基周圍輕快散步小跑
                        const offsetA = Math.random() * Math.PI * 2;
                        this.targetX = playerX + Math.cos(offsetA) * 50;
                        this.targetY = playerY + Math.sin(offsetA) * 50;
                        this.state = 'walking';
                    } else {
                        const cName = (window.adminManager && window.adminManager.config.corgiName) || '魯尼';
                        const dName = (window.adminManager && window.adminManager.config.dogName) || '哈士祈';
                        const derpySays = [
                            `${cName}飛在空中好輕盈喔汪～`,
                            "今天也是悠閒的農場好天氣！",
                            `${dName}我超乖，今天完全沒拆家！`,
                            `想跟${cName}一起在草地上打滾～`
                        ];
                        this.say(derpySays[Math.floor(Math.random() * derpySays.length)], 3);
                    }
                }
                break;
            }
        }
    }

    moveTowards(tx, ty, speed, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
            this.facingLeft = dx < 0;
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
        }
    }

    draw(ctx, animTime) {
        // 繪製哈士奇本體
        if (window.spriteManager) {
            window.spriteManager.drawHusky(ctx, this.x, this.y, this.facingLeft, this.state, animTime);
        }

        // 如果嘴裡含著球
        if (this.isCarryingBall) {
            ctx.save();
            ctx.fillStyle = '#FF5252';
            ctx.beginPath();
            ctx.arc(this.facingLeft ? this.x - 12 : this.x + 12, this.y - 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 繪製哈士奇對話框 / 心情氣泡
        if (this.dialogue) {
            this.drawDialogueBubble(ctx, this.x, this.y - 36, this.dialogue);
        }
    }

    drawDialogueBubble(ctx, x, y, text) {
        ctx.save();
        ctx.font = '12px "Noto Sans TC", sans-serif';
        const metrics = ctx.measureText(text);
        const padding = 7;
        const bw = metrics.width + padding * 2;
        const bh = 24;
        const bx = x - bw / 2;
        const by = y - bh;

        // 氣泡背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#37474F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();
        ctx.stroke();

        // 氣泡小尖角
        ctx.beginPath();
        ctx.moveTo(x - 5, by + bh);
        ctx.lineTo(x, by + bh + 6);
        ctx.lineTo(x + 5, by + bh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 氣泡文字
        ctx.fillStyle = '#263238';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, by + bh / 2);

        ctx.restore();
    }
}

window.HuskyCompanion = HuskyCompanion;
