// Admin Management System
// 密碼保護：自定義主角與狗勾名稱、可種植品種、以及餵食食物配置

const DEFAULT_ADMIN_CONFIG = {
    corgiName: '魯尼',
    dogName: '哈士祈',
    crops: {
        seedless_watermelon: {
            id: 'seedless_watermelon',
            name: '無籽西瓜',
            seedName: '無籽西瓜種子',
            growTime: 12,
            sellPrice: 20,
            seedPrice: 8,
            color: '#2E7D32',
            exp: 15,
            emoji: '🍉',
            desc: '汁多甜脆、消暑解渴，完全無籽的特選美味西瓜！'
        },
        cantaloupe: {
            id: 'cantaloupe',
            name: '哈密瓜',
            seedName: '哈密瓜種子',
            growTime: 22,
            sellPrice: 45,
            seedPrice: 18,
            color: '#FFA726',
            exp: 28,
            emoji: '🍈',
            desc: '細緻網紋、散發濃郁芳香與甘甜果肉的頂級哈密瓜！'
        },
        muskmelon: {
            id: 'muskmelon',
            name: '香瓜',
            seedName: '香瓜種子',
            growTime: 35,
            sellPrice: 80,
            seedPrice: 32,
            color: '#FDD835',
            exp: 42,
            emoji: '🍈',
            desc: '金黃亮麗、口感清脆清甜的翠玉甜香瓜！'
        }
    },
    feedFoods: [
        { id: 'canned_meat', name: '頂級肉罐罐', hunger: 50, happy: 40, emoji: '🥫', price: 40, isShopItem: true },
        { id: 'dental_bone', name: '潔牙大骨', hunger: 35, happy: 30, emoji: '🦴', price: 25, isShopItem: true },
        { id: 'seedless_watermelon', name: '無籽西瓜', hunger: 25, happy: 25, emoji: '🍉', isCrop: true },
        { id: 'cantaloupe', name: '哈密瓜', hunger: 35, happy: 35, emoji: '🍈', isCrop: true },
        { id: 'muskmelon', name: '香瓜', hunger: 45, happy: 45, emoji: '🍈', isCrop: true }
    ]
};

class AdminManager {
    constructor() {
        this.password = '0929';
        this.config = this.loadConfig();
        this.activeTab = 'names';
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('corgi_admin_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 若舊版存檔無無籽西瓜或僅有舊作物，自動遷移並保留三種預設瓜類種子
                if (!parsed.crops || !parsed.crops.seedless_watermelon) {
                    parsed.crops = Object.assign({}, DEFAULT_ADMIN_CONFIG.crops, parsed.crops);
                    if (parsed.crops.bone_sprout && !parsed.crops.cantaloupe) {
                        parsed.crops = JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG.crops));
                    }
                }
                // 更新餵食清單包含新作物
                if (parsed.feedFoods) {
                    const hasMelon = parsed.feedFoods.some(f => f.id === 'seedless_watermelon');
                    if (!hasMelon) {
                        parsed.feedFoods = JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG.feedFoods));
                    }
                }
                return Object.assign({}, DEFAULT_ADMIN_CONFIG, parsed);
            }
        } catch (e) {
            console.warn("載入管理員設定失敗:", e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG));
    }

    saveConfig() {
        localStorage.setItem('corgi_admin_config', JSON.stringify(this.config));
        this.applyConfig();
    }

    resetConfig() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_ADMIN_CONFIG));
        this.saveConfig();
    }

    verifyPassword(input) {
        return String(input).trim() === this.password;
    }

    // 將設定應用至遊戲與介面
    applyConfig() {
        // 1. 同步全域 CROPS_CONFIG
        if (!window.CROPS_CONFIG) {
            window.CROPS_CONFIG = {};
        }
        if (window.CROPS_CONFIG !== this.config.crops) {
            for (const k in window.CROPS_CONFIG) {
                delete window.CROPS_CONFIG[k];
            }
            Object.assign(window.CROPS_CONFIG, JSON.parse(JSON.stringify(this.config.crops)));
        }

        // 2. 更新頁面文字
        const cName = this.config.corgiName || '魯尼';
        const dName = this.config.dogName || '哈士祈';

        document.title = `天使柯基${cName}與${dName}的幸福農場 🐾`;

        const titleEl = document.querySelector('.title-area h1');
        if (titleEl) {
            titleEl.innerHTML = `👼 天使柯基「${cName}」與${dName} 🐾`;
        }

        const huskyAffectionVal = document.getElementById('huskyAffectionVal');
        if (huskyAffectionVal) {
            const parentLabel = huskyAffectionVal.parentElement;
            if (parentLabel) {
                parentLabel.innerHTML = `${dName}夥伴 <span id="huskyAffectionVal" style="color: #546E7A; font-size: 0.8rem;">${huskyAffectionVal.innerText}</span>`;
            }
        }

        // 3. 更新提示指南
        const hintEl = document.querySelector('.controls-hint');
        if (hintEl) {
            hintEl.innerHTML = `⌨️ <b>鍵盤操作</b>：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 控制天使柯基「${cName}」移動 ｜ <kbd>Space 空白鍵</kbd> 或 <kbd>E</kbd> 互動（翻土/澆水/播種/收割/摸${dName}） ｜ <kbd>Q</kbd> 丟球給${dName}撿 ｜ <kbd>1</kbd>~<kbd>6</kbd> 切換工具 ｜ <kbd>R</kbd> 快速切換種子 ｜ 🖱️ 亦可直接點擊農田或${dName}互動！`;
        }

        // 4. 通知 Game 實例更新種子快捷與雜貨鋪
        if (window.gameInstance) {
            window.gameInstance.onAdminConfigUpdated();
        }
    }

    // 初始化 Modal 事件
    initUI() {
        const adminBtn = document.getElementById('openAdminBtn');
        const pwdModal = document.getElementById('adminPwdModal');
        const adminModal = document.getElementById('adminModal');
        const submitPwdBtn = document.getElementById('submitAdminPwdBtn');
        const pwdInput = document.getElementById('adminPwdInput');
        const closePwdBtn = document.getElementById('closeAdminPwdBtn');
        const closeAdminBtn = document.getElementById('closeAdminBtn');

        // 打開密碼對話框
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                pwdInput.value = '';
                pwdModal.classList.add('active');
                setTimeout(() => pwdInput.focus(), 100);
            });
        }

        if (closePwdBtn) {
            closePwdBtn.addEventListener('click', () => {
                pwdModal.classList.remove('active');
            });
        }

        const handleVerify = () => {
            if (this.verifyPassword(pwdInput.value)) {
                pwdModal.classList.remove('active');
                adminModal.classList.add('active');
                this.renderAdminTabs();
            } else {
                alert('密碼錯誤！');
                pwdInput.value = '';
                pwdInput.focus();
            }
        };

        if (submitPwdBtn) {
            submitPwdBtn.addEventListener('click', handleVerify);
        }

        if (pwdInput) {
            pwdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleVerify();
            });
        }

        if (closeAdminBtn) {
            closeAdminBtn.addEventListener('click', () => {
                adminModal.classList.remove('active');
            });
        }

        // 標籤切換
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeTab = btn.dataset.tab;
                this.renderAdminTabs();
            });
        });

        // 恢復預設
        const resetBtn = document.getElementById('resetAdminConfigBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('確定要將所有名稱、品種與食物恢復為預設設定嗎？')) {
                    this.resetConfig();
                    this.renderAdminTabs();
                    alert('已成功恢復預設配置！');
                }
            });
        }

        const resetGameProgressBtn = document.getElementById('resetGameProgressBtn');
        if (resetGameProgressBtn) {
            resetGameProgressBtn.addEventListener('click', () => {
                if (window.gameInstance) {
                    window.gameInstance.resetProgress();
                } else {
                    if (confirm('確定要重置所有遊戲進度嗎？')) {
                        localStorage.removeItem('corgi_farm_save');
                        location.reload();
                    }
                }
            });
        }

        // 儲存按鈕
        const saveBtn = document.getElementById('saveAdminConfigBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveFromInputs();
                this.saveConfig();
                alert('🎉 管理員設定已成功儲存並套用！');
                adminModal.classList.remove('active');
            });
        }

        // 初次套用
        this.applyConfig();
    }

    renderAdminTabs() {
        const contentEl = document.getElementById('adminTabContent');
        if (!contentEl) return;

        if (this.activeTab === 'names') {
            contentEl.innerHTML = `
                <div class="admin-section">
                    <h3>🏷️ 角色名稱自定義</h3>
                    <div class="form-group">
                        <label>主角名稱（天使柯基）：</label>
                        <input type="text" id="adminCorgiNameInput" class="admin-input" value="${this.config.corgiName || '魯尼'}">
                        <small>將應用於遊戲抬頭、操作指引、對話泡泡與外觀選單。</small>
                    </div>
                    <div class="form-group">
                        <label>狗勾夥伴名稱（哈士奇）：</label>
                        <input type="text" id="adminDogNameInput" class="admin-input" value="${this.config.dogName || '哈士祈'}">
                        <small>將應用於狗屋門牌、狀態卡、撫摸/餵食互動與專屬對白。</small>
                    </div>
                </div>
            `;
        } else if (this.activeTab === 'crops') {
            let cropsRows = '';
            for (const id in this.config.crops) {
                const c = this.config.crops[id];
                cropsRows += `
                    <tr data-crop-id="${id}">
                        <td><input type="text" class="crop-emoji-input" value="${c.emoji || '🌱'}" style="width: 38px; text-align: center;"></td>
                        <td><input type="text" class="crop-name-input" value="${c.name}"></td>
                        <td><input type="text" class="crop-seedname-input" value="${c.seedName}"></td>
                        <td><input type="number" class="crop-time-input" value="${c.growTime}" min="3" style="width: 60px;"> 秒</td>
                        <td><input type="number" class="crop-seedprice-input" value="${c.seedPrice}" min="1" style="width: 60px;"> 幣</td>
                        <td><input type="number" class="crop-sellprice-input" value="${c.sellPrice}" min="1" style="width: 60px;"> 幣</td>
                        <td>
                            <input type="color" class="crop-color-input" value="${c.color || '#81C784'}" title="熟成顏色">
                            <button class="btn btn-del-crop" data-id="${id}" style="padding: 2px 6px; font-size: 0.75rem; color: #D32F2F;">✕</button>
                        </td>
                    </tr>
                `;
            }

            contentEl.innerHTML = `
                <div class="admin-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3>🌱 可種植的作物品種管理</h3>
                        <button class="btn btn-primary" id="addNewCropBtn" style="font-size: 0.8rem;">➕ 新增新作物品種</button>
                    </div>
                    <div style="max-height: 250px; overflow-y: auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>圖示</th>
                                    <th>作物名稱</th>
                                    <th>種子名稱</th>
                                    <th>成熟時間</th>
                                    <th>進價</th>
                                    <th>售價</th>
                                    <th>顏色/刪除</th>
                                </tr>
                            </thead>
                            <tbody id="cropsTableBody">
                                ${cropsRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // 綁定新增作物按鈕
            const addBtn = document.getElementById('addNewCropBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    const newId = 'crop_' + Date.now().toString(36);
                    this.config.crops[newId] = {
                        id: newId,
                        name: '新奇小作物',
                        seedName: '新奇種子',
                        growTime: 25,
                        sellPrice: 40,
                        seedPrice: 15,
                        color: '#AB47BC',
                        exp: 25,
                        emoji: '🌸'
                    };
                    this.renderAdminTabs();
                });
            }

            // 綁定刪除作物
            document.querySelectorAll('.btn-del-crop').forEach(b => {
                b.addEventListener('click', () => {
                    const id = b.dataset.id;
                    if (Object.keys(this.config.crops).length <= 1) {
                        alert('至少需要保留一種可種植的作物品種！');
                        return;
                    }
                    if (confirm(`確定要刪除品種【${this.config.crops[id].name}】嗎？`)) {
                        delete this.config.crops[id];
                        this.renderAdminTabs();
                    }
                });
            });

        } else if (this.activeTab === 'foods') {
            let foodsRows = '';
            this.config.feedFoods.forEach((f, idx) => {
                foodsRows += `
                    <tr data-food-index="${idx}">
                        <td><input type="text" class="food-emoji-input" value="${f.emoji || '🍖'}" style="width: 38px; text-align: center;"></td>
                        <td><input type="text" class="food-name-input" value="${f.name}"></td>
                        <td><input type="number" class="food-hunger-input" value="${f.hunger}" min="5" max="100" style="width: 55px;"></td>
                        <td><input type="number" class="food-happy-input" value="${f.happy}" min="5" max="100" style="width: 55px;"></td>
                        <td>
                            <label style="font-size: 0.75rem;">
                                <input type="checkbox" class="food-shop-input" ${f.isShopItem ? 'checked' : ''}> 商店可買
                            </label>
                            <input type="number" class="food-price-input" value="${f.price || 30}" style="width: 50px; display: ${f.isShopItem ? 'inline-block' : 'none'};" title="商店售價">
                        </td>
                        <td>
                            <button class="btn btn-del-food" data-idx="${idx}" style="padding: 2px 6px; font-size: 0.75rem; color: #D32F2F;">✕</button>
                        </td>
                    </tr>
                `;
            });

            contentEl.innerHTML = `
                <div class="admin-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3>🍖 餵食食物與點心配置</h3>
                        <button class="btn btn-primary" id="addNewFoodBtn" style="font-size: 0.8rem;">➕ 新增餵食食物</button>
                    </div>
                    <div style="max-height: 250px; overflow-y: auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>圖示</th>
                                    <th>食物名稱</th>
                                    <th>+飽足</th>
                                    <th>+心情</th>
                                    <th>商店販售/價格</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${foodsRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // 綁定勾選商店販售顯示價格框
            document.querySelectorAll('.food-shop-input').forEach(chk => {
                chk.addEventListener('change', (e) => {
                    const priceInput = chk.parentElement.nextElementSibling;
                    if (priceInput) priceInput.style.display = chk.checked ? 'inline-block' : 'none';
                });
            });

            // 綁定新增食物
            const addFoodBtn = document.getElementById('addNewFoodBtn');
            if (addFoodBtn) {
                addFoodBtn.addEventListener('click', () => {
                    this.config.feedFoods.push({
                        id: 'custom_food_' + Date.now().toString(36),
                        name: '特製香噴噴肉乾',
                        hunger: 40,
                        happy: 35,
                        emoji: '🥩',
                        price: 30,
                        isShopItem: true
                    });
                    this.renderAdminTabs();
                });
            }

            // 綁定刪除食物
            document.querySelectorAll('.btn-del-food').forEach(b => {
                b.addEventListener('click', () => {
                    const idx = parseInt(b.dataset.idx);
                    if (this.config.feedFoods.length <= 1) {
                        alert('至少保留一種餵食食物！');
                        return;
                    }
                    this.config.feedFoods.splice(idx, 1);
                    this.renderAdminTabs();
                });
            });
        }
    }

    saveFromInputs() {
        // 儲存名稱
        const corgiInput = document.getElementById('adminCorgiNameInput');
        if (corgiInput) this.config.corgiName = corgiInput.value.trim() || '魯尼';

        const dogInput = document.getElementById('adminDogNameInput');
        if (dogInput) this.config.dogName = dogInput.value.trim() || '哈士祈';

        // 儲存作物
        const cropRows = document.querySelectorAll('#cropsTableBody tr');
        cropRows.forEach(row => {
            const id = row.dataset.cropId;
            if (this.config.crops[id]) {
                const c = this.config.crops[id];
                c.emoji = row.querySelector('.crop-emoji-input').value.trim() || '🌱';
                c.name = row.querySelector('.crop-name-input').value.trim() || '未知作物';
                c.seedName = row.querySelector('.crop-seedname-input').value.trim() || (c.name + '種子');
                c.growTime = parseInt(row.querySelector('.crop-time-input').value) || 20;
                c.seedPrice = parseInt(row.querySelector('.crop-seedprice-input').value) || 10;
                c.sellPrice = parseInt(row.querySelector('.crop-sellprice-input').value) || 25;
                c.color = row.querySelector('.crop-color-input').value || '#81C784';
            }
        });

        // 儲存食物
        const foodRows = document.querySelectorAll('[data-food-index]');
        foodRows.forEach(row => {
            const idx = parseInt(row.dataset.foodIndex);
            if (this.config.feedFoods[idx]) {
                const f = this.config.feedFoods[idx];
                f.emoji = row.querySelector('.food-emoji-input').value.trim() || '🍖';
                f.name = row.querySelector('.food-name-input').value.trim() || '美味食物';
                f.hunger = parseInt(row.querySelector('.food-hunger-input').value) || 30;
                f.happy = parseInt(row.querySelector('.food-happy-input').value) || 20;
                const isShop = row.querySelector('.food-shop-input').checked;
                f.isShopItem = isShop;
                if (isShop) {
                    f.price = parseInt(row.querySelector('.food-price-input').value) || 30;
                }
            }
        });
    }
}

window.adminManager = new AdminManager();
