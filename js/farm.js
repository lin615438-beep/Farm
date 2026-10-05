// Farm & Crops System
// 負責農田網格、作物生長、澆水、收割、品階機率與農場造景

const DEFAULT_MELON_CROPS = {
    seedless_watermelon: {
        id: 'seedless_watermelon',
        name: '無籽西瓜',
        seedName: '無籽西瓜種子',
        growTime: 12, // 秒
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
};

const CROPS_CONFIG = JSON.parse(JSON.stringify(
    (window.adminManager && window.adminManager.config && window.adminManager.config.crops && Object.keys(window.adminManager.config.crops).length > 0)
        ? window.adminManager.config.crops
        : DEFAULT_MELON_CROPS
));

// 作物品階設定 (一星到五星)
const STAR_CONFIG = {
    1: {
        star: 1,
        name: '一星',
        title: '普通',
        fullName: '一星 · 普通',
        symbol: '★',
        color: '#78909C',
        badgeBg: '#ECEFF1',
        badgeColor: '#455A64',
        priceMultiplier: 1.0,
        expMultiplier: 1.0,
        desc: '標準品質的農作物，新鮮天然。'
    },
    2: {
        star: 2,
        name: '二星',
        title: '優良',
        fullName: '二星 · 優良',
        symbol: '★★',
        color: '#1E88E5',
        badgeBg: '#E3F2FD',
        badgeColor: '#1565C0',
        priceMultiplier: 1.6,
        expMultiplier: 1.3,
        desc: '色澤均勻、甜度出眾的優良品質。'
    },
    3: {
        star: 3,
        name: '三星',
        title: '特級',
        fullName: '三星 · 特級',
        symbol: '★★★',
        color: '#8E24AA',
        badgeBg: '#F3E5F5',
        badgeColor: '#6A1B9A',
        priceMultiplier: 2.5,
        expMultiplier: 1.8,
        desc: '香氣四溢、精心培育的特選農作物！'
    },
    4: {
        star: 4,
        name: '四星',
        title: '頂級',
        fullName: '四星 · 頂級',
        symbol: '★★★★',
        color: '#FB8C00',
        badgeBg: '#FFF3E0',
        badgeColor: '#E65100',
        priceMultiplier: 4.0,
        expMultiplier: 2.5,
        desc: '果形碩大飽滿，散發誘人光澤的頂級珍品！'
    },
    5: {
        star: 5,
        name: '五星',
        title: '神品',
        fullName: '五星 · 神品',
        symbol: '★★★★★',
        color: '#E91E63',
        badgeBg: '#FCE4EC',
        badgeColor: '#C2185B',
        priceMultiplier: 6.5,
        expMultiplier: 3.5,
        desc: '萬中選一、集天地精華之傳說級神品作物！'
    }
};
window.STAR_CONFIG = STAR_CONFIG;

// 等級越高，高品階機率越大
function getStarOdds(farmLevel) {
    const level = Math.max(1, parseInt(farmLevel) || 1);
    const w1 = Math.max(12, 100 - (level - 1) * 7);
    const w2 = Math.max(15, 25 + (level - 1) * 3);
    const w3 = Math.max(5, 5 + (level - 1) * 5);
    const w4 = level >= 2 ? Math.max(1, (level - 1) * 4) : 0;
    const w5 = level >= 3 ? Math.max(0.5, (level - 2) * 3) : 0;
    const total = w1 + w2 + w3 + w4 + w5;
    return {
        1: w1 / total,
        2: w2 / total,
        3: w3 / total,
        4: w4 / total,
        5: w5 / total
    };
}
window.getStarOdds = getStarOdds;

function calculateCropStar(farmLevel) {
    const odds = getStarOdds(farmLevel);
    const rand = Math.random();
    let accumulated = 0;
    for (let s = 1; s <= 5; s++) {
        accumulated += odds[s];
        if (rand <= accumulated) {
            return s;
        }
    }
    return 1;
}
window.calculateCropStar = calculateCropStar;

class FarmPlot {
    constructor(gx, gy, x, y, width, height) {
        this.gx = gx; // 網格 X
        this.gy = gy; // 網格 Y
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.tilled = false; // 是否已翻土
        this.watered = false; // 是否澆水
        this.waterTimer = 0; // 濕潤倒數
        this.crop = null; // 當前種植的作物
        this.growProgress = 0; // 0 ~ 1
        this.stage = 0; // 0: 種子, 1: 幼苗, 2: 成長, 3: 成熟可收割
        this.star = null; // 成熟時決定的品階 (1~5星)
    }

    till() {
        if (!this.tilled) {
            this.tilled = true;
            return true;
        }
        return false;
    }

    water() {
        if (this.tilled && !this.watered) {
            this.watered = true;
            this.waterTimer = 35; // 保持濕潤 35 秒
            return true;
        }
        return false;
    }

    plant(cropId) {
        if (this.tilled && !this.crop && CROPS_CONFIG[cropId]) {
            this.crop = CROPS_CONFIG[cropId];
            this.growProgress = 0;
            this.stage = 0;
            this.star = null;
            return true;
        }
        return false;
    }

    harvest() {
        if (this.crop && this.stage >= 3) {
            const harvested = {
                ...this.crop,
                star: this.star || 1
            };
            this.crop = null;
            this.growProgress = 0;
            this.stage = 0;
            this.star = null;
            return harvested;
        }
        return null;
    }

    update(dt) {
        if (this.watered) {
            this.waterTimer -= dt;
            if (this.waterTimer <= 0) {
                this.watered = false;
            }
        }

        if (this.crop && this.stage < 3) {
            // 濕潤土壤生長速度為 2.2 倍
            const speed = this.watered ? 2.2 : 1.0;
            this.growProgress += (dt / this.crop.growTime) * speed;

            if (this.growProgress >= 1.0) {
                this.stage = 3;
                this.growProgress = 1.0;
                if (!this.star) {
                    const farmLevel = (window.gameInstance && window.gameInstance.player) ? window.gameInstance.player.level : 1;
                    this.star = window.calculateCropStar(farmLevel);
                }
            } else if (this.growProgress >= 0.6) {
                this.stage = 2;
            } else if (this.growProgress >= 0.25) {
                this.stage = 1;
            } else {
                this.stage = 0;
            }
        }
    }

    draw(ctx, animTime) {
        const cx = this.x;
        const cy = this.y;
        const w = this.width;
        const h = this.height;

        // 土壤底色
        ctx.save();
        if (this.tilled) {
            // 耕作過的泥土
            ctx.fillStyle = this.watered ? '#5D4037' : '#8D6E63'; // 濕土偏深咖啡
            ctx.beginPath();
            ctx.roundRect(cx + 2, cy + 2, w - 4, h - 4, 8);
            ctx.fill();

            // 泥土溝紋細節
            ctx.strokeStyle = this.watered ? '#3E2723' : '#6D4C41';
            ctx.lineWidth = 2;
            for (let i = 1; i < 3; i++) {
                const py = cy + (h / 3) * i;
                ctx.beginPath();
                ctx.moveTo(cx + 6, py);
                ctx.lineTo(cx + w - 6, py);
                ctx.stroke();
            }

            // 濕潤反光微光粒子
            if (this.watered) {
                const sparkle = Math.sin(animTime * 4 + this.gx * 2) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(225, 245, 254, ${sparkle * 0.35})`;
                ctx.beginPath();
                ctx.arc(cx + w * 0.3, cy + h * 0.4, 3, 0, Math.PI * 2);
                ctx.arc(cx + w * 0.7, cy + h * 0.6, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 未開墾的野草土塊
            ctx.fillStyle = '#A5D6A7';
            ctx.beginPath();
            ctx.roundRect(cx + 2, cy + 2, w - 4, h - 4, 8);
            ctx.fill();
            // 草點
            ctx.fillStyle = '#81C784';
            ctx.beginPath();
            ctx.arc(cx + w * 0.5, cy + h * 0.5, 4, 0, Math.PI * 2);
            ctx.arc(cx + w * 0.25, cy + h * 0.3, 3, 0, Math.PI * 2);
            ctx.arc(cx + w * 0.75, cy + h * 0.7, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 繪製作物
        if (this.crop) {
            this.drawCrop(ctx, cx + w / 2, cy + h / 2 + 2, animTime);
        }

        ctx.restore();
    }

    drawCrop(ctx, centerX, centerY, animTime) {
        ctx.save();
        ctx.translate(centerX, centerY);

        const crop = this.crop;
        const stage = this.stage;

        if (stage === 0) {
            // 種子階段：小小的種子凸起與小綠芽冒頭
            ctx.fillStyle = '#8D6E63';
            ctx.beginPath();
            ctx.arc(0, 4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#C8E6C9';
            ctx.beginPath();
            ctx.arc(0, 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (stage === 1) {
            // 幼苗階段：小嫩葉
            ctx.fillStyle = '#81C784';
            ctx.beginPath();
            ctx.ellipse(-4, -2, 5, 3, -0.4, 0, Math.PI * 2);
            ctx.ellipse(4, -2, 5, 3, 0.4, 0, Math.PI * 2);
            ctx.fill();
            // 幼苗莖
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.lineTo(0, -3);
            ctx.stroke();
        } else if (stage === 2) {
            // 成長期：茂盛綠葉與半熟果實
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.ellipse(-6, -2, 7, 4, -0.3, 0, Math.PI * 2);
            ctx.ellipse(6, -2, 7, 4, 0.3, 0, Math.PI * 2);
            ctx.ellipse(0, -6, 8, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 小果實輪廓
            ctx.fillStyle = crop.color;
            ctx.beginPath();
            ctx.arc(0, -1, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (stage >= 3) {
            // 成熟期：豐碩可收割！帶有歡樂微跳動動畫與金色驚嘆號
            const hop = Math.sin(animTime * 8) * 3;
            ctx.translate(0, hop);

            // 飽滿大果實
            ctx.fillStyle = crop.color;
            if (crop.id === 'seedless_watermelon') {
                // 無籽西瓜 (深綠條紋瓜身 + 鮮嫩切片展示無黑籽消暑果肉)
                ctx.fillStyle = '#2E7D32';
                ctx.beginPath();
                ctx.ellipse(0, 2, 12, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                // 深綠波浪西瓜條紋
                ctx.strokeStyle = '#1B5E20';
                ctx.lineWidth = 2;
                [-6, -1, 4, 8].forEach(sx => {
                    ctx.beginPath();
                    ctx.moveTo(sx, -6);
                    ctx.quadraticCurveTo(sx + (sx < 0 ? -1.5 : 1.5), 2, sx, 10);
                    ctx.stroke();
                });
                // 切片無籽鮮紅果肉展示 (無黑籽！)
                ctx.fillStyle = '#388E3C';
                ctx.beginPath();
                ctx.arc(5, 4, 7, 0, Math.PI);
                ctx.fill();
                ctx.fillStyle = '#C8E6C9';
                ctx.beginPath();
                ctx.arc(5, 4, 5.8, 0, Math.PI);
                ctx.fill();
                ctx.fillStyle = '#E53935';
                ctx.beginPath();
                ctx.arc(5, 4, 4.8, 0, Math.PI);
                ctx.fill();
                // 水嫩反光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(3.5, 6, 1, 0, Math.PI * 2);
                ctx.fill();
                // 捲曲小果藤
                ctx.strokeStyle = '#81C784';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.quadraticCurveTo(3, -13, 6, -11);
                ctx.stroke();
            } else if (crop.id === 'cantaloupe') {
                // 哈密瓜 (青玉色瓜身 + 華麗淡白網紋 + T字瓜蒂)
                ctx.fillStyle = '#9CCC65';
                ctx.beginPath();
                ctx.ellipse(0, 1, 12, 11, 0, 0, Math.PI * 2);
                ctx.fill();
                // 細緻網紋
                ctx.strokeStyle = 'rgba(255, 253, 231, 0.75)';
                ctx.lineWidth = 1.1;
                for (let i = -7; i <= 7; i += 3.5) {
                    ctx.beginPath();
                    ctx.moveTo(i, -8);
                    ctx.quadraticCurveTo(i * 1.2, 1, i * 0.7, 10);
                    ctx.stroke();
                }
                for (let j = -6; j <= 8; j += 3.5) {
                    ctx.beginPath();
                    ctx.moveTo(-9, j);
                    ctx.quadraticCurveTo(0, j * 0.85, 9, j);
                    ctx.stroke();
                }
                // 哈密瓜 T 字果梗
                ctx.strokeStyle = '#558B2F';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(0, -14);
                ctx.moveTo(-3.5, -14);
                ctx.lineTo(3.5, -14);
                ctx.stroke();
                // 蜜橙色切塊果肉微光
                ctx.fillStyle = '#FFA726';
                ctx.beginPath();
                ctx.arc(5, 4, 3.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (crop.id === 'muskmelon') {
                // 香瓜 (金黃亮眼果身 + 招牌縱向白溝槽紋理)
                ctx.fillStyle = '#FDD835';
                ctx.beginPath();
                ctx.ellipse(0, 1, 11, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                // 純白縱向條紋
                ctx.strokeStyle = '#FFFDE7';
                ctx.lineWidth = 1.8;
                [-6, -3, 0, 3, 6].forEach(sx => {
                    ctx.beginPath();
                    ctx.moveTo(sx * 0.4, -9);
                    ctx.quadraticCurveTo(sx * 1.2, 1, sx * 0.5, 11);
                    ctx.stroke();
                });
                // 瓜蒂與果梗
                ctx.fillStyle = '#7CB342';
                ctx.beginPath();
                ctx.arc(0, -10, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#558B2F';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.quadraticCurveTo(-2, -14, -3, -15);
                ctx.stroke();
                // 光滑果皮高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.beginPath();
                ctx.ellipse(-3, -3, 2.5, 1.2, -0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (crop.id === 'carrot') {
                // 紅蘿蔔
                ctx.beginPath();
                ctx.moveTo(-7, -8);
                ctx.lineTo(7, -8);
                ctx.lineTo(0, 10);
                ctx.closePath();
                ctx.fill();
                // 蘿蔔綠葉
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.ellipse(-5, -12, 6, 2.5, -0.6, 0, Math.PI * 2);
                ctx.ellipse(0, -14, 7, 3, -Math.PI / 2, 0, Math.PI * 2);
                ctx.ellipse(5, -12, 6, 2.5, 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (crop.id === 'bone_sprout') {
                // 骨頭小花 (白色大骨頭開花)
                ctx.fillStyle = '#FAFAFA';
                ctx.beginPath();
                ctx.roundRect(-4, -10, 8, 18, 4);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(-5, -10, 4, 0, Math.PI * 2);
                ctx.arc(5, -10, 4, 0, Math.PI * 2);
                ctx.arc(-5, 8, 4, 0, Math.PI * 2);
                ctx.arc(5, 8, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFD54F';
                ctx.beginPath();
                ctx.arc(0, -1, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (crop.id === 'strawberry') {
                // 萌爪草莓
                ctx.fillStyle = '#E91E63';
                ctx.beginPath();
                ctx.arc(0, -2, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#F8BBD0';
                ctx.beginPath();
                ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
                ctx.arc(-4, -4, 1.8, 0, Math.PI * 2);
                ctx.arc(0, -6, 1.8, 0, Math.PI * 2);
                ctx.arc(4, -4, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#66BB6A';
                ctx.beginPath();
                ctx.arc(0, -9, 4, 0, Math.PI);
                ctx.fill();
            } else if (crop.id === 'meat_melon') {
                // 金黃肉肉瓜
                ctx.fillStyle = '#FFCA28';
                ctx.beginPath();
                ctx.arc(0, 0, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#FFA000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 7, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // 自訂品種果實
                ctx.fillStyle = crop.color || '#AB47BC';
                ctx.beginPath();
                ctx.arc(0, 0, 11, 0, Math.PI * 2);
                ctx.fill();
                if (crop.emoji) {
                    ctx.font = '14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(crop.emoji, 0, 1);
                }
            }

            // 品階星等浮動徽章 (依 plot.star 繪製 1~5 星)
            const star = this.star || 1;
            const starInfo = (window.STAR_CONFIG && window.STAR_CONFIG[star]) ? window.STAR_CONFIG[star] : { color: '#FFD700', symbol: '★' };

            ctx.save();
            ctx.shadowColor = starInfo.color;
            ctx.shadowBlur = star >= 4 ? 9 : 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            const bWidth = star >= 4 ? 38 : (star >= 2 ? 30 : 20);
            ctx.beginPath();
            ctx.roundRect(-bWidth / 2, -26, bWidth, 13, 6);
            ctx.fill();

            ctx.fillStyle = starInfo.color;
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(starInfo.symbol, 0, -19.5);
            ctx.restore();
        }

        ctx.restore();
    }
}

class FarmManager {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.plots = [];
        this.particles = [];
        this.decorations = [];

        this.initFarm();
    }

    initFarm() {
        // 設定農田網格 (3x4 = 12塊田地位於農場中心區域)
        const cols = 4;
        const rows = 3;
        const plotWidth = 56;
        const plotHeight = 48;
        const gapX = 10;
        const gapY = 10;
        
        const totalW = cols * plotWidth + (cols - 1) * gapX;
        const startX = (this.canvasWidth - totalW) / 2;
        const startY = 220;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = startX + c * (plotWidth + gapX);
                const py = startY + r * (plotHeight + gapY);
                const plot = new FarmPlot(c, r, px, py, plotWidth, plotHeight);
                // 預設開墾前 4 塊土地讓玩家新手能馬上種植
                if (r === 0 || (r === 1 && c <= 1)) {
                    plot.tilled = true;
                }
                this.plots.push(plot);
            }
        }

        // 初始化造景物 (狗屋、水盆、向日葵花叢、圍欄)
        this.decorations = [
            { type: 'doghouse', x: 130, y: 150, width: 80, height: 75 },
            { type: 'waterbowl', x: 220, y: 175, width: 34, height: 26 },
            { type: 'bonebasket', x: 260, y: 170, width: 36, height: 28 },
            { type: 'tree', x: 70, y: 280, width: 50, height: 70 },
            { type: 'tree', x: 740, y: 260, width: 55, height: 75 },
            { type: 'flowerpatch', x: 700, y: 160, width: 80, height: 40 }
        ];
    }

    // 取得指定座標所在的農田
    getPlotAt(x, y) {
        return this.plots.find(p => 
            x >= p.x && x <= p.x + p.width &&
            y >= p.y && y <= p.y + p.height
        );
    }

    // 取得角色前方的最近農田
    getNearestPlot(x, y, maxDistance = 55) {
        let nearest = null;
        let minDist = maxDistance;

        for (const p of this.plots) {
            const centerX = p.x + p.width / 2;
            const centerY = p.y + p.height / 2;
            const dist = Math.hypot(x - centerX, y - centerY);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        }
        return nearest;
    }

    addParticle(x, y, type, text = '', color = '#FFF') {
        this.particles.push({
            x: x + (Math.random() * 12 - 6),
            y: y + (Math.random() * 12 - 6),
            vx: (Math.random() - 0.5) * 40,
            vy: -40 - Math.random() * 40,
            alpha: 1.0,
            life: 0.9,
            maxLife: 0.9,
            type, // 'text', 'water', 'sparkle', 'heart', 'bone'
            text,
            color,
            size: Math.random() * 4 + 4
        });
    }

    update(dt) {
        // 更新所有農田
        for (const plot of this.plots) {
            plot.update(dt);
        }

        // 更新漂浮粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, animTime) {
        // 1. 農場草坪背景與步道
        this.drawGround(ctx, animTime);

        // 2. 靜態裝飾物 (狗屋、樹木、向日葵花叢)
        this.drawDecorations(ctx, animTime);

        // 3. 所有農田土壤與作物
        for (const plot of this.plots) {
            plot.draw(ctx, animTime);
        }

        // 4. 浮動粒子效果
        this.drawParticles(ctx);
    }

    drawGround(ctx, animTime) {
        // 柔和綠色大草地
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, '#C8E6C9');
        grad.addColorStop(1, '#A5D6A7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 木質圍欄頂部
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(20, 110);
        ctx.lineTo(this.canvasWidth - 20, 110);
        ctx.stroke();

        for (let x = 30; x < this.canvasWidth - 20; x += 36) {
            ctx.fillStyle = '#A1887F';
            ctx.fillRect(x, 90, 8, 40);
            ctx.beginPath();
            ctx.moveTo(x, 90);
            ctx.lineTo(x + 4, 82);
            ctx.lineTo(x + 8, 90);
            ctx.closePath();
            ctx.fill();
        }

        // 可愛鵝卵石小路 (連接狗屋與農田)
        ctx.fillStyle = 'rgba(238, 238, 238, 0.65)';
        const pathCoords = [
            [230, 205, 14, 9], [250, 215, 16, 10], [270, 230, 13, 8],
            [300, 240, 15, 11], [330, 245, 14, 9], [370, 250, 16, 10]
        ];
        for (const [px, py, rx, ry] of pathCoords) {
            ctx.beginPath();
            ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDecorations(ctx, animTime) {
        for (const deco of this.decorations) {
            ctx.save();
            if (deco.type === 'doghouse') {
                // 溫馨大狗屋 (哈士奇的家)
                const dx = deco.x;
                const dy = deco.y;
                // 屋身
                ctx.fillStyle = '#FFCC80';
                ctx.fillRect(dx, dy, deco.width, deco.height);
                // 紅色屋頂
                ctx.fillStyle = '#EF5350';
                ctx.beginPath();
                ctx.moveTo(dx - 8, dy);
                ctx.lineTo(dx + deco.width / 2, dy - 32);
                ctx.lineTo(dx + deco.width + 8, dy);
                ctx.closePath();
                ctx.fill();
                // 門洞
                ctx.fillStyle = '#5D4037';
                ctx.beginPath();
                ctx.arc(dx + deco.width / 2, dy + deco.height - 20, 16, Math.PI, 0);
                ctx.rect(dx + deco.width / 2 - 16, dy + deco.height - 20, 32, 20);
                ctx.fill();
                // 門牌 (置中且帶圓角與邊框)
                const plateWidth = deco.width - 14;
                const plateHeight = 16;
                const plateX = dx + (deco.width - plateWidth) / 2;
                const plateY = dy + 6;

                ctx.fillStyle = '#FFF8E1';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(plateX, plateY, plateWidth, plateHeight, 3);
                } else {
                    ctx.rect(plateX, plateY, plateWidth, plateHeight);
                }
                ctx.fill();

                ctx.strokeStyle = '#FFE082';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#D84315';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const dName = (window.adminManager && window.adminManager.config.dogName) || '哈士祈';
                const text = `${dName}的家 🐾`;

                let fontSize = 10;
                ctx.font = `bold ${fontSize}px sans-serif`;
                while (ctx.measureText(text).width > plateWidth - 4 && fontSize > 7) {
                    fontSize -= 0.5;
                    ctx.font = `bold ${fontSize}px sans-serif`;
                }
                ctx.fillText(text, dx + deco.width / 2, plateY + plateHeight / 2);

            } else if (deco.type === 'waterbowl') {
                // 狗勾水盆
                ctx.fillStyle = '#4FC3F7';
                ctx.beginPath();
                ctx.ellipse(deco.x, deco.y, 16, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                // 清水波紋
                ctx.fillStyle = '#E1F5FE';
                ctx.beginPath();
                ctx.ellipse(deco.x, deco.y - 1, 12, 6, 0, 0, Math.PI * 2);
                ctx.fill();

            } else if (deco.type === 'bonebasket') {
                // 零食小籃子
                ctx.fillStyle = '#D7CCC8';
                ctx.beginPath();
                ctx.roundRect(deco.x, deco.y, deco.width, deco.height, 5);
                ctx.fill();
                // 露出的骨頭
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(deco.x + 10, deco.y + 2, 4, 0, Math.PI * 2);
                ctx.arc(deco.x + 18, deco.y + 4, 4, 0, Math.PI * 2);
                ctx.arc(deco.x + 26, deco.y + 2, 4, 0, Math.PI * 2);
                ctx.fill();

            } else if (deco.type === 'tree') {
                // 蓬鬆樹木
                ctx.fillStyle = '#795548';
                ctx.fillRect(deco.x + deco.width / 2 - 6, deco.y + 20, 12, deco.height - 20);
                ctx.fillStyle = '#81C784';
                ctx.beginPath();
                ctx.arc(deco.x + deco.width / 2, deco.y + 15, 26, 0, Math.PI * 2);
                ctx.arc(deco.x + deco.width / 2 - 12, deco.y + 20, 20, 0, Math.PI * 2);
                ctx.arc(deco.x + deco.width / 2 + 12, deco.y + 20, 20, 0, Math.PI * 2);
                ctx.fill();

            } else if (deco.type === 'flowerpatch') {
                // 彩色小花叢
                const colors = ['#FF4081', '#FFEB3B', '#7C4DFF', '#FF5722'];
                for (let i = 0; i < 5; i++) {
                    const fx = deco.x + i * 15;
                    const fy = deco.y + (i % 2) * 8;
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.beginPath();
                    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#FFFDE7';
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 14px "Comic Sans MS", "Noto Sans TC", sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 4;
                ctx.fillText(p.text, p.x, p.y);

            } else if (p.type === 'water') {
                ctx.fillStyle = '#29B6F6';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

            } else if (p.type === 'sparkle') {
                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
                ctx.fill();

            } else if (p.type === 'heart') {
                ctx.fillStyle = '#FF4081';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('♥', p.x, p.y);
            }

            ctx.restore();
        }
    }
}

window.FarmManager = FarmManager;
window.CROPS_CONFIG = CROPS_CONFIG;
