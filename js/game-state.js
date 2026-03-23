// --- 遊戲狀態變數 ---
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let gameActive = false;
let gameStarted = false; 
let isPaused = false;
let isTrialMode = false;
let score = 0;
let level = 1;
let exp = 0;
let expToNext = 6;
let totalFrames = 0; 
let eliteSpawnedInCurrentMin = 0;
let lastElapsedMinute = 0;
let secondCounter = 0;
let enemyIdCounter = 0;
let lastTime = 0; 
let runBonusGold = 0; 

let player = {};
let projectiles = [];
let enemies = [];
let keys = {};
let enemyProjectiles = []; 
let floatingTexts = []; 
let encounteredEnemies = new Set(); 
let bossSpawned = false; 

// --- 章節狀態與配置 ---
let unlockedChapter = parseInt(localStorage.getItem('cubeRPG_unlockedChapter') || 1);
let selectedChapter = 1;

const chapterData = [
    { id: 1, name: '第一章：方塊森林', multiplier: 1, hasBoss: true },
    { id: 2, name: '第二章：方塊山谷', multiplier: 3, hasBoss: false }
];

// --- 數據配置 ---
const enemyTypes = {
    normal: { 
        name: '紅色方塊', 
        desc: '最基礎的敵人，會緩慢地向你靠近。', 
        color: '#ff4d4d', size: 25, hp: 65, speed: 1.6, damage: 15, exp: 1 
    },
    charger: { 
        name: '衝鋒方塊', 
        desc: '速度極快且致命，小心它的突襲！', 
        color: '#ffaa00', size: 18, hp: 40, speed: 4.5, damage: 30, exp: 2 
    },
    tank: { 
        name: '裝甲方塊', 
        desc: '巨大的威脅，擁有極高的生命值與破壞力。', 
        color: '#7700aa', size: 55, hp: 350, speed: 1, damage: 35, exp: 15 
    },
    sniperBoss: { 
        name: '狙擊手', 
        desc: '最終Boss，會保持距離並發射多種追蹤彈藥。',
        color: '#ff0055', size: 65, hp: 25000, speed: 2, damage: 20, exp: 100 
    }
};

// --- 升級池定義 ---
const baseUpgradePool = [
    { name: '射速強化', desc: '射擊頻率提升 20%', action: () => { player.fireRate *= 0.8; } },
    { name: '威力加強', desc: '子彈傷害提升 20%', action: () => { player.damage *= 1.2; } },
    { name: '多重射擊', desc: '子彈數量 +1', action: () => { player.bulletCount += 1; } },
    { name: '霰彈射擊', desc: '子彈數量 +2 且散射變高', action: () => { player.bulletCount += 2; player.spread += 0.25; } },
    { name: '鏈鎖彈射', desc: '擊中後彈向另一名敵人', action: () => { player.chainBounce += 1; } },
    { name: '速射散射', desc: '射速大幅提升但帶有散射', action: () => { player.fireRate *= 0.6; player.spread += 0.25; } },
    { name: '超音速彈', desc: '子彈飛行速度提升 30%', action: () => { player.bulletSpeed *= 1.3; } },
    { name: '超頻位移', desc: '移動速度提升 15%', action: () => { player.speed *= 1.15; } },
    { name: '路徑反彈', desc: '子彈撞牆可反彈 1 次', action: () => { player.bounces += 1; } },
    { name: '結構加固', desc: '最大生命提升 20%', action: () => { const hpBonus = player.maxHp * 0.2; player.maxHp += hpBonus; player.hp += hpBonus; } },
    { name: '生命回復', desc: '立即回復 40% 最大生命', action: () => { player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.4)); } }
];
let runUpgrades = []; 

let cubeLevel = parseInt(localStorage.getItem('cubeRPG_cubeLevel') || 1);