// Main Game Controller
// 負責玩家操控、遊戲迴圈、背包與整合種子快捷切換、拋球、商店交易及管理員回呼

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width = 860;
        this.height = this.canvas.height = 540;

        // 玩家 (天使柯基) 狀態
        this.player = {
            x: 430,
            y: 360,
            speed: 165,
            facingLeft: false,
            isMoving: false,
            level: 1,
            exp: 0
        };

        // 鍵盤輸入
        this.keys = {};

        // 系統管理員
        this.farm = new FarmManager(this.width, this.height);
        this.husky = new HuskyCompanion(490, 360);

        // 拋球物理實體 (若有丟球)
        this.activeBall = null;

        // 當前選擇工具: 'hoe' (1), 'water' (2), 'seed' (3), 'ball' (4), 'pet' (5), 'feed' (6)
        this.activeTool = 'hoe';

        // 整合式種子袋：當前裝備的種子品種 ID (可按 R 或點擊抽屜自由切換)
        this.activeSeedId = 'seedless_watermelon';

        // 背包與經濟 (包含種子、收成作物與點心)
        this.coins = 60;
        this.inventory = {
            seed_seedless_watermelon: 5,
            seed_cantaloupe: 5,
            seed_muskmelon: 5,
            canned_meat: 2,
            dental_bone: 1
        };

        // 作物品階圖鑑 (記錄每種作物各星級收成狀態)
        this.compendium = {};

        this.animTime = 0;
        this.lastFrameTime = performance.now();

        this.loadSave();
        this.bindEvents();
        this.updateUI();

        // 啟動主迴圈
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // 鍵盤與滑鼠事件
    bindEvents() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            // 首次按下任何按鍵初始化音效引擎
            if (window.soundEngine) window.soundEngine.init();

            // 快捷鍵 1~6 切換精簡工具列
            if (key === '1') this.selectTool('hoe');
            if (key === '2') this.selectTool('water');
            if (key === '3') this.selectTool('seed');
            if (key === '4') this.selectTool('ball');
            if (key === '5') this.selectTool('pet');
            if (key === '6') this.selectTool('feed');

            // 快捷切換種子品種 R
            if (key === 'r') {
                this.cycleActiveSeed();
            }

            // 互動鍵 E 或 空白鍵
            if (key === ' ' || key === 'e') {
                e.preventDefault();
                this.performAction();
            }

            // 丟球快捷鍵 Q
            if (key === 'q') {
                this.throwBall();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // 點擊畫布直接與農田或哈士奇互動
        this.canvas.addEventListener('click', (e) => {
            if (window.soundEngine) window.soundEngine.init();
            this.toggleSeedDrawer(true);

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            this.handleCanvasClick(mx, my);
        });

        // 工具列按鈕點選
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.dataset.tool;
                if (tool === 'seed') {
                    // 若點擊切換小藥丸或當前已經在種子工具，則打開/關閉品種抽屜
                    if (e.target.id === 'seedSwitchPill' || this.activeTool === 'seed') {
                        this.toggleSeedDrawer();
                    } else {
                        this.selectTool('seed');
                    }
                } else {
                    this.toggleSeedDrawer(true);
                    this.selectTool(tool);
                }
            });
        });

        // 關閉種子抽屜按鈕
        const closeDrawerBtn = document.getElementById('closeSeedDrawerBtn');
        if (closeDrawerBtn) {
            closeDrawerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSeedDrawer(true);
            });
        }

        // 音樂與音效開關
        const bgmBtn = document.getElementById('bgmToggleBtn');
        if (bgmBtn) {
            bgmBtn.addEventListener('click', () => {
                const isPlaying = window.soundEngine.toggleBgm();
                bgmBtn.innerHTML = isPlaying ? '🎵 音樂: 播放中' : '🔇 音樂: 靜音';
                bgmBtn.classList.toggle('active', isPlaying);
            });
        }

        const sfxBtn = document.getElementById('sfxToggleBtn');
        if (sfxBtn) {
            sfxBtn.addEventListener('click', () => {
                const isMuted = window.soundEngine.toggleMute();
                sfxBtn.innerHTML = isMuted ? '🔇 音效: 關' : '🔊 音效: 開';
            });
        }

        // 綁定自訂圖片 Modal
        this.setupCustomSkinModal();

        // 綁定商店 Modal
        this.setupShopModal();

        // 綁定作物品階圖鑑 Modal
        this.setupCompendiumModal();
    }

    selectTool(toolId) {
        this.activeTool = toolId;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolId);
        });
        if (window.soundEngine) window.soundEngine.playStep();
    }

    // 輪播下一個可種植品種 (按 R)
    cycleActiveSeed() {
        const crops = window.CROPS_CONFIG || {};
        const cropIds = Object.keys(crops);
        if (cropIds.length === 0) return;

        let currentIndex = cropIds.indexOf(this.activeSeedId);
        if (currentIndex === -1) currentIndex = 0;
        const nextIndex = (currentIndex + 1) % cropIds.length;
        this.activeSeedId = cropIds[nextIndex];
        
        this.selectTool('seed');

        const activeCrop = crops[this.activeSeedId];
        const seedKey = this.getSeedKey(this.activeSeedId);
        const count = this.inventory[seedKey] || 0;
        const seedName = activeCrop.seedName || (activeCrop.name + '種子');
        this.farm.addParticle(this.player.x, this.player.y - 25, 'text', `切換：${seedName} (${count})`, '#FFD54F');
        if (window.soundEngine) window.soundEngine.playStep();
        this.updateUI();
    }

    // 開關浮動種子抽屜
    toggleSeedDrawer(forceClose = false) {
        const drawer = document.getElementById('seedDrawer');
        if (!drawer) return;
        if (forceClose || drawer.classList.contains('active')) {
            drawer.classList.remove('active');
        } else {
            drawer.classList.add('active');
            this.renderSeedDrawer();
        }
    }

    // 渲染種子抽屜內部清單
    renderSeedDrawer() {
        const listEl = document.getElementById('seedDrawerList');
        if (!listEl) return;
        listEl.innerHTML = '';
        const crops = window.CROPS_CONFIG || {};

        for (const id in crops) {
            const crop = crops[id];
            const seedKey = this.getSeedKey(id);
            const count = this.inventory[seedKey] || 0;
            const item = document.createElement('div');
            item.className = 'seed-drawer-item' + (this.activeSeedId === id ? ' active' : '');
            item.innerHTML = `
                <span>${crop.emoji || '🌱'} ${crop.seedName || (crop.name + '種子')}</span>
                <span style="font-size: 0.75rem; color: #8D6E63; font-weight: bold;">擁有: ${count}</span>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activeSeedId = id;
                this.selectTool('seed');
                this.toggleSeedDrawer(true);
                this.updateUI();
            });
            listEl.appendChild(item);
        }
    }

    getSeedKey(cropId) {
        // 相容舊存檔鍵值
        if (cropId === 'bone_sprout') {
            return this.inventory['seed_bone_sprout'] !== undefined ? 'seed_bone_sprout' : 'seed_bone';
        }
        return 'seed_' + cropId;
    }

    handleCanvasClick(mx, my) {
        // 點擊狗勾互動
        const distToHusky = Math.hypot(mx - this.husky.x, my - this.husky.y);
        if (distToHusky < 40) {
            this.interactWithHusky();
            return;
        }

        // 若目前持球工具，朝點擊處投擲
        if (this.activeTool === 'ball') {
            this.throwBall(mx, my);
            return;
        }

        // 點擊農田
        const plot = this.farm.getPlotAt(mx, my);
        if (plot) {
            this.interactWithPlot(plot);
        }
    }

    // 玩家主要行動 (按 Space / E)
    performAction() {
        // 檢查身邊是否有狗勾
        const distToHusky = Math.hypot(this.player.x - this.husky.x, this.player.y - this.husky.y);
        if (distToHusky < 55) {
            if (this.activeTool === 'pet' || this.activeTool === 'feed') {
                this.interactWithHusky();
                return;
            }
        }

        // 若選擇丟球
        if (this.activeTool === 'ball') {
            this.throwBall();
            return;
        }

        // 取得前方最近的農田
        const plot = this.farm.getNearestPlot(this.player.x, this.player.y, 65);
        if (plot) {
            this.interactWithPlot(plot);
        } else {
            // 如果身在狗勾附近但沒特定田地，摸摸狗勾
            if (distToHusky < 60) {
                this.interactWithHusky();
            }
        }
    }

    // 與農田互動
    interactWithPlot(plot) {
        // 1. 若作物成熟，優先收成！(任何工具皆可一鍵收成)
        if (plot.crop && plot.stage >= 3) {
            const harvested = plot.harvest();
            if (harvested) {
                const star = harvested.star || 1;
                const starInfo = (window.STAR_CONFIG && window.STAR_CONFIG[star]) ? window.STAR_CONFIG[star] : { color: '#FFD700', symbol: '★', title: '普通', expMultiplier: 1.0 };
                
                // 存入帶有品階的背包 key (例如 seedless_watermelon_star_3)
                const cropStarKey = `${harvested.id}_star_${star}`;
                this.inventory[cropStarKey] = (this.inventory[cropStarKey] || 0) + 1;

                // 登錄圖鑑並檢查是否為新解鎖
                const isNewUnlock = this.unlockCompendium(harvested.id, star);

                // 品階越高獲得越多農場經驗值
                const exp = Math.round((harvested.exp || 15) * starInfo.expMultiplier);
                this.addExp(exp);

                if (window.soundEngine) {
                    if (star >= 4) {
                        window.soundEngine.playCoin();
                    }
                    window.soundEngine.playHarvest();
                }

                this.farm.addParticle(
                    plot.x + plot.width / 2,
                    plot.y + 10,
                    'text',
                    `+1 [${starInfo.symbol} ${starInfo.title}] ${harvested.name}!`,
                    starInfo.color
                );
                this.farm.addParticle(plot.x + plot.width / 2, plot.y, 'sparkle');

                if (isNewUnlock) {
                    setTimeout(() => {
                        this.farm.addParticle(
                            this.player.x,
                            this.player.y - 30,
                            'text',
                            `✨【圖鑑新收錄】${harvested.name} ${starInfo.symbol}！`,
                            '#FFD700'
                        );
                    }, 260);
                }

                this.updateUI();
                this.saveGame();
                return;
            }
        }

        // 2. 鋤頭翻土
        if (this.activeTool === 'hoe') {
            if (!plot.tilled) {
                if (plot.till()) {
                    if (window.soundEngine) window.soundEngine.playTill();
                    this.farm.addParticle(plot.x + plot.width / 2, plot.y + plot.height / 2, 'text', '翻土🌱', '#A1887F');
                    this.saveGame();
                }
            } else if (!plot.crop) {
                this.farm.addParticle(plot.x + plot.width / 2, plot.y + 10, 'text', '已翻土！請切換【3 播種】種下種子🌱', '#81C784');
            }
            return;
        }

        // 3. 水壺澆水
        if (this.activeTool === 'water') {
            if (plot.tilled && !plot.watered) {
                if (plot.water()) {
                    if (window.soundEngine) window.soundEngine.playWater();
                    this.farm.addParticle(plot.x + plot.width / 2, plot.y + plot.height / 2, 'water');
                    this.saveGame();
                }
            }
            return;
        }

        // 4. 播種 (整合式種子袋)
        if (this.activeTool === 'seed') {
            const cropId = this.activeSeedId;
            const crops = window.CROPS_CONFIG || {};
            const crop = crops[cropId];
            const seedKey = this.getSeedKey(cropId);
            const seedCount = this.inventory[seedKey] || 0;

            if (seedCount > 0 && crop) {
                if (plot.tilled && !plot.crop) {
                    if (plot.plant(cropId)) {
                        this.inventory[seedKey]--;
                        if (window.soundEngine) window.soundEngine.playPlant();
                        this.farm.addParticle(plot.x + plot.width / 2, plot.y + 10, 'text', `播種 ${crop.emoji || '🌱'}`, '#81C784');
                        this.updateUI();
                        this.saveGame();
                    }
                } else if (!plot.tilled) {
                    this.farm.addParticle(plot.x + plot.width / 2, plot.y, 'text', '需要先翻土喔！', '#FF7043');
                }
            } else {
                const sName = crop ? (crop.seedName || crop.name + '種子') : '種子';
                this.farm.addParticle(this.player.x, this.player.y - 20, 'text', `【${sName}】已用完！按 R 切換`, '#FFA726');
            }
            return;
        }
    }

    // 與狗勾夥伴互動 (摸摸 / 餵食)
    interactWithHusky() {
        if (this.activeTool === 'feed') {
            // 讀取管理員配置的食物菜單
            const feedList = (window.adminManager && window.adminManager.config.feedFoods) ? window.adminManager.config.feedFoods : [];

            let fedItem = null;
            for (const food of feedList) {
                if (food.isCrop) {
                    // 若是農作物，支援餵食各品階 (優先從低星級開始餵)
                    for (let s = 1; s <= 5; s++) {
                        const starKey = `${food.id}_star_${s}`;
                        if ((this.inventory[starKey] || 0) > 0) {
                            this.inventory[starKey]--;
                            const starInfo = (window.STAR_CONFIG && window.STAR_CONFIG[s]) ? window.STAR_CONFIG[s] : { symbol: '★', title: '普通' };
                            const bonusHunger = (food.hunger || 25) + (s - 1) * 6;
                            const bonusHappy = (food.happy || 20) + (s - 1) * 8;
                            fedItem = {
                                name: `${starInfo.symbol} ${food.name}`,
                                hunger: bonusHunger,
                                happy: bonusHappy
                            };
                            this.husky.feed(fedItem.name, fedItem.hunger, fedItem.happy);
                            break;
                        }
                    }
                    // 相容舊無品階 key
                    if (!fedItem && (this.inventory[food.id] || 0) > 0) {
                        this.inventory[food.id]--;
                        fedItem = food;
                        this.husky.feed(food.name, food.hunger || 25, food.happy || 20);
                    }
                    if (fedItem) break;
                } else {
                    if ((this.inventory[food.id] || 0) > 0) {
                        this.inventory[food.id]--;
                        fedItem = food;
                        this.husky.feed(food.name, food.hunger || 30, food.happy || 20);
                        break;
                    }
                }
            }

            if (!fedItem) {
                const dName = (window.adminManager && window.adminManager.config.dogName) || '哈士祈';
                this.husky.say(`包包裡沒有${dName}想吃的食物汪～`, 2.5);
                this.farm.addParticle(this.husky.x, this.husky.y - 20, 'text', '背包沒食物！', '#FFA726');
            }
            this.updateUI();
            this.saveGame();
        } else {
            // 摸摸
            this.husky.pet();
            this.farm.addParticle(this.husky.x, this.husky.y - 15, 'heart');
        }
    }

    // 拋球給狗勾撿
    throwBall(targetX = null, targetY = null) {
        if (this.activeBall) return;

        const startX = this.player.x;
        const startY = this.player.y;

        let tx = targetX;
        let ty = targetY;
        if (tx === null || ty === null) {
            const throwDistance = 140 + Math.random() * 40;
            const dir = this.player.facingLeft ? -1 : 1;
            tx = Math.max(80, Math.min(this.width - 80, startX + dir * throwDistance));
            ty = Math.max(140, Math.min(this.height - 80, startY + (Math.random() * 60 - 30)));
        }

        this.activeBall = {
            x: startX,
            y: startY,
            startX: startX,
            startY: startY,
            targetX: tx,
            targetY: ty,
            progress: 0,
            duration: 0.7,
            bounceHeight: 60
        };

        if (window.soundEngine) window.soundEngine.playBallThrow();
        this.husky.chaseBall(tx, ty);
    }

    addCoins(amount) {
        this.coins += amount;
        this.updateUI();
        this.saveGame();
    }

    addExp(amount) {
        this.player.exp += amount;
        const needExp = this.player.level * 60;
        if (this.player.exp >= needExp) {
            this.player.exp -= needExp;
            this.player.level++;
            this.farm.addParticle(this.player.x, this.player.y - 30, 'text', `🎉 農場升級 Lv.${this.player.level}!`, '#FFD700');
            if (window.soundEngine) window.soundEngine.playHarvest();
        }
    }

    updatePlayer(dt) {
        let vx = 0;
        let vy = 0;

        if (this.keys['w'] || this.keys['arrowup']) vy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) vy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) vx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) vx += 1;

        if (vx !== 0 || vy !== 0) {
            const len = Math.hypot(vx, vy);
            vx /= len;
            vy /= len;

            this.player.x += vx * this.player.speed * dt;
            this.player.y += vy * this.player.speed * dt;

            this.player.x = Math.max(35, Math.min(this.width - 35, this.player.x));
            this.player.y = Math.max(130, Math.min(this.height - 30, this.player.y));

            if (vx < 0) this.player.facingLeft = true;
            if (vx > 0) this.player.facingLeft = false;

            this.player.isMoving = true;

            if (Math.random() < 0.25) {
                this.farm.addParticle(this.player.x, this.player.y + 10, 'sparkle');
            }
        } else {
            this.player.isMoving = false;
        }

        if (this.activeBall) {
            const ball = this.activeBall;
            ball.progress += dt / ball.duration;
            if (ball.progress >= 1.0) {
                ball.progress = 1.0;
                ball.x = ball.targetX;
                ball.y = ball.targetY;
                if (window.soundEngine) window.soundEngine.playBallBounce();
                if (this.husky.isCarryingBall) {
                    this.activeBall = null;
                }
            } else {
                const t = ball.progress;
                ball.x = ball.startX + (ball.targetX - ball.startX) * t;
                const arc = Math.sin(t * Math.PI) * ball.bounceHeight;
                ball.y = ball.startY + (ball.targetY - ball.startY) * t - arc;
            }
        }
    }

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = timestamp;
        this.animTime += dt;

        this.updatePlayer(dt);
        this.husky.update(dt, this.player.x, this.player.y, this.farm);
        this.farm.update(dt);

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.farm.draw(this.ctx, this.animTime);

        if (this.activeBall && !this.husky.isCarryingBall) {
            this.ctx.save();
            this.ctx.fillStyle = '#FF5252';
            this.ctx.beginPath();
            this.ctx.arc(this.activeBall.x, this.activeBall.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.stroke();
            this.ctx.restore();
        }

        if (this.player.y < this.husky.y) {
            window.spriteManager.drawAngelCorgi(this.ctx, this.player.x, this.player.y, this.player.facingLeft, this.player.isMoving, this.animTime);
            this.husky.draw(this.ctx, this.animTime);
        } else {
            this.husky.draw(this.ctx, this.animTime);
            window.spriteManager.drawAngelCorgi(this.ctx, this.player.x, this.player.y, this.player.facingLeft, this.player.isMoving, this.animTime);
        }

        this.updateHuskyHUD();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateUI() {
        const coinEl = document.getElementById('coinDisplay');
        if (coinEl) coinEl.innerText = this.coins;

        const levelEl = document.getElementById('farmLevelDisplay');
        if (levelEl) levelEl.innerText = this.player.level;

        // 更新整合式種子袋資訊
        const crops = window.CROPS_CONFIG || {};
        if (!crops[this.activeSeedId]) {
            const firstId = Object.keys(crops)[0];
            if (firstId) this.activeSeedId = firstId;
        }

        const activeCrop = crops[this.activeSeedId];
        if (activeCrop) {
            const iconEl = document.getElementById('activeSeedIcon');
            const labelEl = document.getElementById('activeSeedLabel');
            const countEl = document.getElementById('count_active_seed');

            if (iconEl) iconEl.innerText = activeCrop.emoji || '🌱';
            if (labelEl) labelEl.innerText = activeCrop.seedName || (activeCrop.name + '種子');
            const seedKey = this.getSeedKey(this.activeSeedId);
            if (countEl) countEl.innerText = this.inventory[seedKey] || 0;
        }

        // 更新動態狗勾名稱
        const dName = (window.adminManager && window.adminManager.config.dogName) || '哈士祈';
        const petLabel = document.getElementById('petToolLabel');
        if (petLabel) petLabel.innerText = `撫摸${dName}`;

        // 重新渲染種子抽屜
        const drawer = document.getElementById('seedDrawer');
        if (drawer && drawer.classList.contains('active')) {
            this.renderSeedDrawer();
        }
    }

    updateHuskyHUD() {
        const happyBar = document.getElementById('huskyHappyBar');
        const hungerBar = document.getElementById('huskyHungerBar');
        const affVal = document.getElementById('huskyAffectionVal');

        if (happyBar) happyBar.style.width = `${Math.round(this.husky.happiness)}%`;
        if (hungerBar) hungerBar.style.width = `${Math.round(this.husky.hunger)}%`;
        if (affVal) affVal.innerText = `Lv.${this.husky.affection}`;
    }

    // 當管理員設定更新時觸發
    onAdminConfigUpdated() {
        this.updateUI();
        this.renderShopItems();
    }

    setupCustomSkinModal() {
        const modal = document.getElementById('skinModal');
        const openBtn = document.getElementById('openSkinBtn');
        const closeBtn = document.getElementById('closeSkinBtn');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('active');
            });
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        const corgiInput = document.getElementById('corgiImgInput');
        if (corgiInput) {
            corgiInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        window.spriteManager.setCustomCorgiImage(evt.target.result);
                        this.updateSkinPreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const huskyInput = document.getElementById('huskyImgInput');
        if (huskyInput) {
            huskyInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        window.spriteManager.setCustomHuskyImage(evt.target.result);
                        this.updateSkinPreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const corgiModeSelect = document.getElementById('corgiModeSelect');
        if (corgiModeSelect) {
            corgiModeSelect.value = window.spriteManager.corgiSettings.mode;
            corgiModeSelect.addEventListener('change', () => {
                window.spriteManager.corgiSettings.mode = corgiModeSelect.value;
                window.spriteManager.saveSettings();
            });
        }

        const corgiWingsCheckbox = document.getElementById('corgiWingsCheckbox');
        if (corgiWingsCheckbox) {
            corgiWingsCheckbox.checked = window.spriteManager.corgiSettings.addHaloAndWings;
            corgiWingsCheckbox.addEventListener('change', () => {
                window.spriteManager.corgiSettings.addHaloAndWings = corgiWingsCheckbox.checked;
                window.spriteManager.saveSettings();
            });
        }

        const resetBtn = document.getElementById('resetSkinBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                window.spriteManager.setCustomCorgiImage(null);
                window.spriteManager.setCustomHuskyImage(null);
                this.updateSkinPreview();
                alert('已恢復預設角色！');
            });
        }
    }

    updateSkinPreview() {
        const corgiPrev = document.getElementById('corgiPreview');
        const huskyPrev = document.getElementById('huskyPreview');
        if (corgiPrev) {
            corgiPrev.style.backgroundImage = window.spriteManager.corgiCustomImg ? `url(${window.spriteManager.corgiCustomImg.src})` : 'none';
        }
        if (huskyPrev) {
            huskyPrev.style.backgroundImage = window.spriteManager.huskyCustomImg ? `url(${window.spriteManager.huskyCustomImg.src})` : 'none';
        }
    }

    setupCompendiumModal() {
        const modal = document.getElementById('compendiumModal');
        const openBtn = document.getElementById('openCompendiumBtn');
        const closeBtn = document.getElementById('closeCompendiumBtn');
        const resetBtn = document.getElementById('resetCompendiumProgressBtn');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('active');
                this.renderCompendium();
            });
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetProgress();
            });
        }
    }

    resetProgress() {
        if (confirm('⚠️ 確定要重置所有遊戲進度嗎？\n\n這將會：\n1. 將農場等級與經驗重置為 Lv.1 (0 EXP)\n2. 將金幣重置為初始 60 幣\n3. 重新提供無籽西瓜、哈密瓜、香瓜種子各 5 顆\n4. 清空田地並重置圖鑑解鎖紀錄重新開始\n\n點擊「確定」立即重置並重新載入農場！')) {
            localStorage.removeItem('corgi_farm_save');
            location.reload();
        }
    }

    unlockCompendium(cropId, star) {
        if (!this.compendium[cropId]) {
            this.compendium[cropId] = {};
        }
        const isNew = !this.compendium[cropId][star];
        this.compendium[cropId][star] = (this.compendium[cropId][star] || 0) + 1;
        this.saveGame();
        return isNew;
    }

    getCompendiumStats() {
        const crops = window.CROPS_CONFIG || {};
        const cropIds = Object.keys(crops);
        const totalPossible = cropIds.length * 5;
        let totalUnlocked = 0;
        for (const id of cropIds) {
            if (this.compendium[id]) {
                for (let s = 1; s <= 5; s++) {
                    if (this.compendium[id][s] > 0) {
                        totalUnlocked++;
                    }
                }
            }
        }
        const percent = totalPossible > 0 ? Math.round((totalUnlocked / totalPossible) * 100) : 0;
        return { totalUnlocked, totalPossible, percent };
    }

    renderCompendium() {
        const stats = this.getCompendiumStats();
        const rateEl = document.getElementById('compendiumUnlockRate');
        if (rateEl) rateEl.innerText = `${stats.totalUnlocked} / ${stats.totalPossible} (${stats.percent}%)`;

        const levelEl = document.getElementById('compendiumFarmLevel');
        if (levelEl) levelEl.innerText = `Lv.${this.player.level}`;

        const fillEl = document.getElementById('compendiumProgressFill');
        if (fillEl) fillEl.style.width = `${stats.percent}%`;

        // 機率展示
        const oddsBadgesEl = document.getElementById('compendiumOddsBadges');
        if (oddsBadgesEl && window.getStarOdds) {
            const odds = window.getStarOdds(this.player.level);
            oddsBadgesEl.innerHTML = '';
            for (let s = 1; s <= 5; s++) {
                const info = (window.STAR_CONFIG && window.STAR_CONFIG[s]) ? window.STAR_CONFIG[s] : { symbol: '★', title: '普通' };
                const pct = (odds[s] * 100).toFixed(1);
                const badge = document.createElement('div');
                badge.className = `odd-badge star-${s}`;
                badge.innerHTML = `<div>${info.symbol} ${info.title}</div><div style="font-size: 0.85rem; margin-top: 2px;">${pct}%</div>`;
                oddsBadgesEl.appendChild(badge);
            }
        }

        // 渲染各作物卡片
        const listEl = document.getElementById('compendiumCardsList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const crops = window.CROPS_CONFIG || {};
        for (const cropId in crops) {
            const crop = crops[cropId];
            const cropRecord = this.compendium[cropId] || {};
            let cropUnlockedCount = 0;
            for (let s = 1; s <= 5; s++) {
                if (cropRecord[s] > 0) cropUnlockedCount++;
            }
            const isMaster = cropUnlockedCount === 5;

            const card = document.createElement('div');
            card.className = 'compendium-card';

            let slotsHtml = '';
            for (let s = 1; s <= 5; s++) {
                const sInfo = (window.STAR_CONFIG && window.STAR_CONFIG[s]) ? window.STAR_CONFIG[s] : { symbol: '★', title: '普通', color: '#999', priceMultiplier: 1.0 };
                const isUnlocked = Boolean(cropRecord[s] && cropRecord[s] > 0);
                const price = Math.round(crop.sellPrice * sInfo.priceMultiplier);

                if (isUnlocked) {
                    slotsHtml += `
                        <div class="star-slot unlocked star-${s}">
                            <div class="star-symbols">${sInfo.symbol}</div>
                            <div class="star-rank-title" style="color: ${sInfo.color};">${sInfo.title}</div>
                            <div class="star-price-tag">售價: ${price}幣</div>
                            <div class="star-count-tag">收成: ${cropRecord[s]}次</div>
                        </div>
                    `;
                } else {
                    slotsHtml += `
                        <div class="star-slot locked star-${s}">
                            <div class="lock-icon">🔒</div>
                            <div class="star-symbols" style="color: #B0BEC5;">${sInfo.symbol}</div>
                            <div class="lock-text">未解鎖</div>
                        </div>
                    `;
                }
            }

            card.innerHTML = `
                <div class="crop-card-header">
                    <div class="crop-card-title">
                        <span>${crop.emoji || '🌱'}</span>
                        <span>${crop.name}</span>
                    </div>
                    <div class="crop-card-tags">
                        <span class="crop-card-tag ${isMaster ? 'master' : ''}">
                            ${isMaster ? '👑 全品階達成 (5/5)' : `已解鎖 ${cropUnlockedCount}/5 品階`}
                        </span>
                        <span class="crop-card-tag">成熟: ${crop.growTime}秒</span>
                    </div>
                </div>
                <div class="crop-card-desc">${crop.desc || `農場精心培育的美味${crop.name}！`}</div>
                <div class="star-slots-grid">
                    ${slotsHtml}
                </div>
            `;
            listEl.appendChild(card);
        }
    }

    setupShopModal() {
        const modal = document.getElementById('shopModal');
        const openBtn = document.getElementById('openShopBtn');
        const closeBtn = document.getElementById('closeShopBtn');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('active');
                this.renderShopItems();
            });
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    renderShopItems() {
        const crops = window.CROPS_CONFIG || {};

        // 1. 販賣作物列表 (支援品階 1~5 星與一鍵全賣)
        const sellList = document.getElementById('shopSellList');
        if (sellList) {
            sellList.innerHTML = '';

            // 計算所有收成作物總價值與總數量
            let grandTotalCount = 0;
            let grandTotalValue = 0;

            for (const cropId in crops) {
                const config = crops[cropId];
                // 檢查 1~5 星
                for (let s = 1; s <= 5; s++) {
                    const starKey = `${cropId}_star_${s}`;
                    const count = this.inventory[starKey] || 0;
                    if (count > 0) {
                        const sInfo = (window.STAR_CONFIG && window.STAR_CONFIG[s]) ? window.STAR_CONFIG[s] : { priceMultiplier: 1.0 };
                        const unitPrice = Math.round(config.sellPrice * sInfo.priceMultiplier);
                        grandTotalCount += count;
                        grandTotalValue += unitPrice * count;
                    }
                }
                // 相容舊存檔無品階 key
                const legacyCount = this.inventory[cropId] || 0;
                if (legacyCount > 0) {
                    grandTotalCount += legacyCount;
                    grandTotalValue += config.sellPrice * legacyCount;
                }
            }

            // 一鍵全賣按鈕
            const sellAllBtn = document.createElement('button');
            sellAllBtn.className = 'btn-sell-all-harvest';
            sellAllBtn.disabled = grandTotalCount === 0;
            sellAllBtn.innerHTML = grandTotalCount > 0 
                ? `💰 一鍵賣出所有收成 (${grandTotalCount} 個，共 +${grandTotalValue} 狗勾幣)`
                : `💰 目前背包無任何收成作物`;
            sellAllBtn.addEventListener('click', () => {
                if (grandTotalCount > 0) {
                    for (const cropId in crops) {
                        for (let s = 1; s <= 5; s++) {
                            const starKey = `${cropId}_star_${s}`;
                            if (this.inventory[starKey]) delete this.inventory[starKey];
                        }
                        if (this.inventory[cropId]) delete this.inventory[cropId];
                    }
                    this.addCoins(grandTotalValue);
                    if (window.soundEngine) window.soundEngine.playCoin();
                    this.renderShopItems();
                    this.updateUI();
                }
            });
            sellList.appendChild(sellAllBtn);

            // 逐一顯示每種作物的各品階庫存
            for (const cropId in crops) {
                const config = crops[cropId];
                let cropTotalCount = 0;
                let cropTotalValue = 0;

                const starRows = [];
                for (let s = 1; s <= 5; s++) {
                    const starKey = `${cropId}_star_${s}`;
                    const count = this.inventory[starKey] || 0;
                    if (count > 0) {
                        const sInfo = (window.STAR_CONFIG && window.STAR_CONFIG[s]) ? window.STAR_CONFIG[s] : { symbol: '★', title: '普通', color: '#999', priceMultiplier: 1.0 };
                        const unitPrice = Math.round(config.sellPrice * sInfo.priceMultiplier);
                        cropTotalCount += count;
                        cropTotalValue += unitPrice * count;

                        const row = document.createElement('div');
                        row.className = 'shop-star-row';
                        row.innerHTML = `
                            <div class="shop-star-info">
                                <span class="shop-star-badge" style="background: ${sInfo.badgeBg || '#ECEFF1'}; color: ${sInfo.badgeColor || '#37474F'};">
                                    ${sInfo.symbol} ${sInfo.title}
                                </span>
                                <span>擁有: <b>${count}</b> (單價: ${unitPrice}幣)</span>
                            </div>
                            <div class="shop-star-actions">
                                <button class="btn btn-sell btn-sell-one" title="賣出 1 個">賣 1 個 (+${unitPrice}幣)</button>
                                <button class="btn btn-sell btn-sell-tier-all" title="全賣此品階">全賣 (+${unitPrice * count}幣)</button>
                            </div>
                        `;

                        row.querySelector('.btn-sell-one').addEventListener('click', () => {
                            if ((this.inventory[starKey] || 0) > 0) {
                                this.inventory[starKey]--;
                                this.addCoins(unitPrice);
                                if (window.soundEngine) window.soundEngine.playCoin();
                                this.renderShopItems();
                                this.updateUI();
                            }
                        });

                        row.querySelector('.btn-sell-tier-all').addEventListener('click', () => {
                            const c = this.inventory[starKey] || 0;
                            if (c > 0) {
                                delete this.inventory[starKey];
                                this.addCoins(unitPrice * c);
                                if (window.soundEngine) window.soundEngine.playCoin();
                                this.renderShopItems();
                                this.updateUI();
                            }
                        });

                        starRows.push(row);
                    }
                }

                // 相容無品階舊 key
                const legacyCount = this.inventory[cropId] || 0;
                if (legacyCount > 0) {
                    cropTotalCount += legacyCount;
                    cropTotalValue += config.sellPrice * legacyCount;
                    const legRow = document.createElement('div');
                    legRow.className = 'shop-star-row';
                    legRow.innerHTML = `
                        <div class="shop-star-info">
                            <span class="shop-star-badge" style="background: #ECEFF1; color: #455A64;">普通品</span>
                            <span>擁有: <b>${legacyCount}</b> (單價: ${config.sellPrice}幣)</span>
                        </div>
                        <div class="shop-star-actions">
                            <button class="btn btn-sell btn-sell-legacy-all">全賣 (+${config.sellPrice * legacyCount}幣)</button>
                        </div>
                    `;
                    legRow.querySelector('.btn-sell-legacy-all').addEventListener('click', () => {
                        delete this.inventory[cropId];
                        this.addCoins(config.sellPrice * legacyCount);
                        if (window.soundEngine) window.soundEngine.playCoin();
                        this.renderShopItems();
                        this.updateUI();
                    });
                    starRows.push(legRow);
                }

                const cropCard = document.createElement('div');
                cropCard.className = 'shop-crop-card';

                const cardHeader = document.createElement('div');
                cardHeader.className = 'shop-crop-card-header';
                cardHeader.innerHTML = `
                    <span>${config.emoji || '🌱'} ${config.name} (總庫存: <b>${cropTotalCount}</b>)</span>
                    ${cropTotalCount > 0 ? `<button class="btn btn-sell btn-sell-crop-all" style="padding: 2px 7px; font-size: 0.74rem;">全賣此作物 (+${cropTotalValue}幣)</button>` : '<span style="font-size: 0.72rem; color: #9E9E9E; font-weight: normal;">無庫存</span>'}
                `;

                if (cropTotalCount > 0) {
                    cardHeader.querySelector('.btn-sell-crop-all').addEventListener('click', () => {
                        for (let s = 1; s <= 5; s++) {
                            delete this.inventory[`${cropId}_star_${s}`];
                        }
                        delete this.inventory[cropId];
                        this.addCoins(cropTotalValue);
                        if (window.soundEngine) window.soundEngine.playCoin();
                        this.renderShopItems();
                        this.updateUI();
                    });
                }

                cropCard.appendChild(cardHeader);

                if (starRows.length > 0) {
                    starRows.forEach(r => cropCard.appendChild(r));
                }

                sellList.appendChild(cropCard);
            }
        }

        // 2. 購買種子與好料 (包含所有自訂種子與自訂食物)
        const buyList = document.getElementById('shopBuyList');
        if (buyList) {
            buyList.innerHTML = '';
            const items = [];

            // 加入所有品種種子
            for (const id in crops) {
                const c = crops[id];
                const seedKey = this.getSeedKey(id);
                items.push({
                    id: seedKey,
                    name: c.seedName || (c.name + '種子'),
                    price: c.seedPrice || 10,
                    emoji: c.emoji || '🌱'
                });
            }

            // 加入商店點心
            const feedList = (window.adminManager && window.adminManager.config.feedFoods) ? window.adminManager.config.feedFoods : [];
            feedList.forEach(f => {
                if (f.isShopItem) {
                    items.push({
                        id: f.id,
                        name: f.name,
                        price: f.price || 30,
                        emoji: f.emoji || '🥫'
                    });
                }
            });

            items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'shop-row';
                row.innerHTML = `
                    <span>${it.emoji} ${it.name} - <b>${it.price} 幣</b></span>
                    <button class="btn btn-buy" data-id="${it.id}">購買</button>
                `;
                row.querySelector('.btn-buy').addEventListener('click', () => {
                    if (this.coins >= it.price) {
                        this.coins -= it.price;
                        this.inventory[it.id] = (this.inventory[it.id] || 0) + 1;
                        if (window.soundEngine) window.soundEngine.playCoin();
                        this.updateUI();
                        this.saveGame();
                        this.renderShopItems();
                    } else {
                        alert('金幣不足喔！多收成作物賺取金幣吧！');
                    }
                });
                buyList.appendChild(row);
            });
        }
    }

    saveGame() {
        try {
            const data = {
                coins: this.coins,
                inventory: this.inventory,
                compendium: this.compendium,
                activeSeedId: this.activeSeedId,
                level: this.player.level,
                exp: this.player.exp,
                husky: {
                    happiness: this.husky.happiness,
                    hunger: this.husky.hunger,
                    affection: this.husky.affection
                }
            };
            localStorage.setItem('corgi_farm_save', JSON.stringify(data));
        } catch (e) {
            console.warn("存檔失敗:", e);
        }
    }

    loadSave() {
        try {
            const saved = localStorage.getItem('corgi_farm_save');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.coins !== undefined) this.coins = data.coins;
                if (data.inventory) this.inventory = Object.assign(this.inventory, data.inventory);
                if (data.compendium) this.compendium = data.compendium;
                if (data.activeSeedId) this.activeSeedId = data.activeSeedId;
                if (data.level) this.player.level = data.level;
                if (data.exp) this.player.exp = data.exp;
                if (data.husky) {
                    this.husky.happiness = data.husky.happiness || 85;
                    this.husky.hunger = data.husky.hunger || 80;
                    this.husky.affection = data.husky.affection || 1;
                }
            }

            // 確保預設三種瓜類種子存在 (無籽西瓜、哈密瓜、香瓜)
            ['seed_seedless_watermelon', 'seed_cantaloupe', 'seed_muskmelon'].forEach(s => {
                if (this.inventory[s] === undefined) {
                    this.inventory[s] = 5;
                }
            });

            // 檢查當前選擇種子是否有效
            const crops = window.CROPS_CONFIG || {};
            if (!crops[this.activeSeedId]) {
                this.activeSeedId = Object.keys(crops)[0] || 'seedless_watermelon';
            }
        } catch (e) {
            console.warn("載入存檔失敗:", e);
        }
    }
}

// 視窗載入後啟動
window.addEventListener('DOMContentLoaded', () => {
    if (window.adminManager) window.adminManager.initUI();
    window.gameInstance = new Game();
});
