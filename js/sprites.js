// Canvas roundRect 相容性補充
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 0) {
        if (typeof r === 'number') r = [r, r, r, r];
        const [tl, tr, br, bl] = r;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

class SpriteManager {
    constructor() {
        this.corgiCustomImg = null;
        this.huskyCustomImg = null;

        // 設定選項
        this.corgiSettings = {
            mode: 'circle', // 'circle' (圓形頭像徽章) 或 'sprite' (透明立繪)
            addHaloAndWings: true, // 自動加上飄浮天使光環與拍動小翅膀
            scale: 1.0
        };

        this.huskySettings = {
            mode: 'circle',
            scale: 1.0
        };

        this.loadSettings();
        this.loadSavedImages();
    }

    loadSettings() {
        try {
            const savedCorgi = localStorage.getItem('corgi_settings');
            if (savedCorgi) this.corgiSettings = Object.assign(this.corgiSettings, JSON.parse(savedCorgi));

            const savedHusky = localStorage.getItem('husky_settings');
            if (savedHusky) this.huskySettings = Object.assign(this.huskySettings, JSON.parse(savedHusky));
        } catch (e) {
            console.warn("讀取設定失敗:", e);
        }
    }

    saveSettings() {
        localStorage.setItem('corgi_settings', JSON.stringify(this.corgiSettings));
        localStorage.setItem('husky_settings', JSON.stringify(this.huskySettings));
    }

    loadSavedImages() {
        // 先嘗試從 localStorage 載入玩家上傳的自訂圖片
        const corgiData = localStorage.getItem('custom_corgi_image');
        if (corgiData) {
            const img = new Image();
            img.onload = () => { this.corgiCustomImg = img; };
            img.src = corgiData;
        } else {
            // 嘗試載入 assets/corgi.png (如果使用者直接丟在資料夾)
            const fallbackImg = new Image();
            fallbackImg.onload = () => { this.corgiCustomImg = fallbackImg; };
            fallbackImg.onerror = () => { /* 使用程式預設向量繪製 */ };
            fallbackImg.src = 'assets/corgi.png';
        }

        const huskyData = localStorage.getItem('custom_husky_image');
        if (huskyData) {
            const img = new Image();
            img.onload = () => { this.huskyCustomImg = img; };
            img.src = huskyData;
        } else {
            // 嘗試載入 assets/husky.png
            const fallbackImg = new Image();
            fallbackImg.onload = () => { this.huskyCustomImg = fallbackImg; };
            fallbackImg.onerror = () => { /* 使用程式預設向量繪製 */ };
            fallbackImg.src = 'assets/husky.png';
        }
    }

    setCustomCorgiImage(dataUrl) {
        if (!dataUrl) {
            this.corgiCustomImg = null;
            localStorage.removeItem('custom_corgi_image');
            return;
        }
        const img = new Image();
        img.onload = () => {
            this.corgiCustomImg = img;
            localStorage.setItem('custom_corgi_image', dataUrl);
        };
        img.src = dataUrl;
    }

    setCustomHuskyImage(dataUrl) {
        if (!dataUrl) {
            this.huskyCustomImg = null;
            localStorage.removeItem('custom_husky_image');
            return;
        }
        const img = new Image();
        img.onload = () => {
            this.huskyCustomImg = img;
            localStorage.setItem('custom_husky_image', dataUrl);
        };
        img.src = dataUrl;
    }

    // ==========================================
    // 繪製天使柯基 (Player)
    // ==========================================
    drawAngelCorgi(ctx, x, y, facingLeft, isMoving, animTime) {
        ctx.save();
        ctx.translate(x, y);

        // 走路上下彈跳 / 待機呼吸浮動
        const bounce = isMoving ? Math.sin(animTime * 14) * 4 : Math.sin(animTime * 3) * 2;
        ctx.translate(0, bounce);

        // 方向翻轉
        if (facingLeft) {
            ctx.scale(-1, 1);
        }

        // 影子
        this.drawShadow(ctx, 0, 16 - bounce * 0.5, 24, 8);

        if (this.corgiCustomImg && this.corgiCustomImg.complete && this.corgiCustomImg.naturalWidth > 0) {
            // 使用自訂圖片繪製
            this.drawCustomImage(ctx, this.corgiCustomImg, this.corgiSettings, 54, animTime, true);
        } else {
            // 預設向量天使柯基
            this.drawDefaultAngelCorgi(ctx, animTime, isMoving);
        }

        ctx.restore();
    }

    // ==========================================
    // 繪製哈士奇 (Companion)
    // ==========================================
    drawHusky(ctx, x, y, facingLeft, state, animTime) {
        ctx.save();
        ctx.translate(x, y);

        // 動作動畫
        let bounce = 0;
        let rotation = 0;
        if (state === 'running' || state === 'fetch') {
            bounce = Math.sin(animTime * 16) * 5;
        } else if (state === 'walking') {
            bounce = Math.sin(animTime * 10) * 3;
        } else if (state === 'digging') {
            bounce = Math.sin(animTime * 22) * 2;
            rotation = Math.sin(animTime * 22) * 0.15;
        } else if (state === 'sleeping') {
            bounce = Math.sin(animTime * 2) * 1;
        } else {
            bounce = Math.sin(animTime * 3) * 1.5;
        }

        ctx.translate(0, bounce);
        ctx.rotate(rotation);

        if (facingLeft) {
            ctx.scale(-1, 1);
        }

        // 影子
        this.drawShadow(ctx, 0, 18 - bounce * 0.5, 26, 9);

        if (this.huskyCustomImg && this.huskyCustomImg.complete && this.huskyCustomImg.naturalWidth > 0) {
            // 使用自訂圖片繪製
            this.drawCustomImage(ctx, this.huskyCustomImg, this.huskySettings, 52, animTime, false);
        } else {
            // 預設向量哈士奇
            this.drawDefaultHusky(ctx, animTime, state);
        }

        ctx.restore();
    }

    // 圓形頭像徽章或立繪渲染
    drawCustomImage(ctx, img, settings, size, animTime, isAngel) {
        const halfSize = size / 2;
        
        // 天使翅膀 (背後一層)
        if (isAngel && settings.addHaloAndWings) {
            this.drawWings(ctx, -halfSize * 0.8, -halfSize * 0.2, animTime, false);
            this.drawWings(ctx, halfSize * 0.8, -halfSize * 0.2, animTime, true);
        }

        if (settings.mode === 'circle') {
            // 圓形頭像徽章模式：漂亮金邊/銀邊圓框
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
            ctx.closePath();

            // 外發光/邊框 (天使柯基藍色外框、哈士奇銀灰色外框)
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = isAngel ? '#42A5F5' : '#B0BEC5';
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // 裁切內部貼上照片
            ctx.clip();
            ctx.drawImage(img, -halfSize, -halfSize, size, size);
            ctx.restore();

            // 補畫外框層次
            ctx.beginPath();
            ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = isAngel ? '#1976D2' : '#78909C';
            ctx.stroke();

        } else {
            // 透明立繪模式
            ctx.drawImage(img, -halfSize, -halfSize, size, size);
        }

        // 飄浮天使光環
        if (isAngel && settings.addHaloAndWings) {
            this.drawHalo(ctx, 0, -halfSize - 6, animTime);
        }
    }

    // 飄浮光環
    drawHalo(ctx, x, y, animTime) {
        ctx.save();
        const floatY = y + Math.sin(animTime * 4) * 2;
        ctx.translate(x, floatY);

        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#FFE082';
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // 內圈金光
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 4.5, 0, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#FFF9C4';
        ctx.stroke();

        ctx.restore();
    }

    // 拍動的小羽翼翅膀
    drawWings(ctx, x, y, animTime, isRight) {
        ctx.save();
        ctx.translate(x, y);
        const flap = Math.sin(animTime * 12) * 0.25;
        ctx.rotate((isRight ? 0.3 : -0.3) + flap * (isRight ? 1 : -1));

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E0F7FA';
        ctx.lineWidth = 1.5;

        // 羽毛輪廓
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(isRight ? 18 : -18, -12, isRight ? 24 : -24, 0);
        ctx.quadraticCurveTo(isRight ? 20 : -20, 8, isRight ? 12 : -12, 12);
        ctx.quadraticCurveTo(isRight ? 6 : -6, 8, 0, 0);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // 地面柔和陰影
    drawShadow(ctx, x, y, radiusX, radiusY) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fill();
        ctx.restore();
    }

    // ==========================================
    // 預設向量版天使柯基 (可愛肥屁屁與翅膀)
    // ==========================================
    drawDefaultAngelCorgi(ctx, animTime, isMoving) {
        // 天使翅膀 (左、右)
        this.drawWings(ctx, -14, -8, animTime, false);
        this.drawWings(ctx, 14, -8, animTime, true);

        // 身體 (夢幻天使天空藍)
        ctx.fillStyle = '#64B5F6'; // 柯基天使天藍色
        ctx.beginPath();
        ctx.ellipse(0, 4, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // 白色肚肚
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, 6, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 柯基耳朵 (尖尖大立耳 - 湛藍羽色)
        ctx.fillStyle = '#1E88E5';
        // 左耳
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(-18, -24);
        ctx.lineTo(-6, -14);
        ctx.closePath();
        ctx.fill();
        // 耳內柔粉藍
        ctx.fillStyle = '#E1F5FE';
        ctx.beginPath();
        ctx.moveTo(-11, -9);
        ctx.lineTo(-16, -21);
        ctx.lineTo(-7, -14);
        ctx.closePath();
        ctx.fill();

        // 右耳
        ctx.fillStyle = '#1E88E5';
        ctx.beginPath();
        ctx.moveTo(12, -8);
        ctx.lineTo(18, -24);
        ctx.lineTo(6, -14);
        ctx.closePath();
        ctx.fill();
        // 耳內柔粉藍
        ctx.fillStyle = '#E1F5FE';
        ctx.beginPath();
        ctx.moveTo(11, -9);
        ctx.lineTo(16, -21);
        ctx.lineTo(7, -14);
        ctx.closePath();
        ctx.fill();

        // 頭部 (天藍色)
        ctx.fillStyle = '#64B5F6';
        ctx.beginPath();
        ctx.arc(0, -6, 14, 0, Math.PI * 2);
        ctx.fill();

        // 臉部白條紋 (柯基招牌)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-7, 2);
        ctx.lineTo(7, 2);
        ctx.lineTo(5, -6);
        ctx.closePath();
        ctx.fill();

        // 眼睛
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(-5, -7, 2.2, 0, Math.PI * 2);
        ctx.arc(5, -7, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // 眼神光
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-4.5, -8, 0.8, 0, Math.PI * 2);
        ctx.arc(5.5, -8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 黑黑小鼻子
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(0, -2, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 吐小舌頭
        ctx.fillStyle = '#FF8A80';
        ctx.beginPath();
        ctx.arc(0, 1.5, 2, 0, Math.PI);
        ctx.fill();

        // 小短腿 (隨移動擺動)
        const legOffset = isMoving ? Math.sin(animTime * 14) * 3 : 0;
        ctx.fillStyle = '#FFFFFF';
        // 前左、前右
        ctx.beginPath();
        ctx.ellipse(-8, 14 + legOffset, 3.5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(8, 14 - legOffset, 3.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // 飄浮天使光環
        this.drawHalo(ctx, 0, -24, animTime);
    }

    // ==========================================
    // 預設向量版哈士奇 (經典藍眼與三把火面具)
    // ==========================================
    drawDefaultHusky(ctx, animTime, state) {
        // 身體 (優雅銀灰與白)
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.ellipse(0, 5, 17, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // 白色肚毛
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath();
        ctx.ellipse(0, 7, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 毛茸茸蓬鬆尾巴 (銀灰色搖擺)
        const tailWag = Math.sin(animTime * 12) * 0.4;
        ctx.save();
        ctx.translate(-13, 3);
        ctx.rotate(-0.5 + tailWag);
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.ellipse(-8, -4, 9, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // 尾尖白毛
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-14, -6, 4, 3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 哈士奇耳朵 (石板銀灰)
        ctx.fillStyle = '#78909C';
        // 左耳
        ctx.beginPath();
        ctx.moveTo(-11, -8);
        ctx.lineTo(-16, -23);
        ctx.lineTo(-5, -13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath();
        ctx.moveTo(-10, -9);
        ctx.lineTo(-14, -20);
        ctx.lineTo(-6, -13);
        ctx.closePath();
        ctx.fill();

        // 右耳
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.moveTo(11, -8);
        ctx.lineTo(16, -23);
        ctx.lineTo(5, -13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath();
        ctx.moveTo(10, -9);
        ctx.lineTo(14, -20);
        ctx.lineTo(6, -13);
        ctx.closePath();
        ctx.fill();

        // 頭部基底 (銀灰)
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.arc(0, -6, 14, 0, Math.PI * 2);
        ctx.fill();

        // 哈士奇招牌面具白花紋
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-4, -6);
        ctx.lineTo(-11, -3);
        ctx.lineTo(-11, 4);
        ctx.lineTo(11, 4);
        ctx.lineTo(11, -3);
        ctx.lineTo(4, -6);
        ctx.closePath();
        ctx.fill();

        // 眼睛 (招牌清澈冰晶藍眼！)
        if (state === 'sleeping') {
            // 閉眼
            ctx.strokeStyle = '#37474F';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(-5, -6, 2.5, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(5, -6, 2.5, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            // 冰藍大眼睛
            ctx.fillStyle = '#29B6F6';
            ctx.beginPath();
            ctx.arc(-5, -6, 2.8, 0, Math.PI * 2);
            ctx.arc(5, -6, 2.8, 0, Math.PI * 2);
            ctx.fill();
            // 瞳孔
            ctx.fillStyle = '#01579B';
            ctx.beginPath();
            ctx.arc(-5, -6, 1.4, 0, Math.PI * 2);
            ctx.arc(5, -6, 1.4, 0, Math.PI * 2);
            ctx.fill();
            // 眼神高光
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-4.5, -7, 0.8, 0, Math.PI * 2);
            ctx.arc(5.5, -7, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // 鼻子
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(0, -1, 2.3, 0, Math.PI * 2);
        ctx.fill();

        // 傻呼呼開朗吐舌頭
        if (state !== 'sleeping') {
            ctx.fillStyle = '#FF8A80';
            ctx.beginPath();
            ctx.arc(1.5, 3.5, 2.5, 0, Math.PI);
            ctx.fill();
        }

        // 四肢爪爪
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-7, 14, 3.5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(7, 14, 3.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 實例化
window.spriteManager = new SpriteManager();
