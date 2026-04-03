// --- 遊戲狀態變數 ---
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let gameActive = false;
let gameStarted = false; 
let isPaused = false;
let isTrialMode = false;
let gameMode = 'normal'; 
let levelUpsPending = 0; 
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
let joystick = { active: false, dx: 0, dy: 0 }; 
let enemyProjectiles = []; 
let floatingTexts = [];
let explosions = [];
let encounteredEnemies = new Set(); 
let bossSpawned = false; 

// --- 章節狀態與配置 ---
let unlockedChapter = parseInt(localStorage.getItem('cubeRPG_unlockedChapter') || 1);
let selectedChapter = 1;

// --- 試煉等級動態物件（取代個別變數）---
let trialLevels = {
    sniperTrialLevel: parseInt(localStorage.getItem('cubeRPG_sniperTrialLevel') || 1),
    chaseTrialLevel: parseInt(localStorage.getItem('cubeRPG_chaseTrialLevel') || 1),
    octopusTrialLevel: parseInt(localStorage.getItem('cubeRPG_octopusTrialLevel') || 1),
    summonerTrialLevel: parseInt(localStorage.getItem('cubeRPG_summonerTrialLevel') || 1),
    twinTrialLevel: parseInt(localStorage.getItem('cubeRPG_twinTrialLevel') || 1),
    prismTrialLevel: parseInt(localStorage.getItem('cubeRPG_prismTrialLevel') || 1)
};

// --- 試煉統一配置表 ---
const TRIAL_CONFIG = {
    sniper: {
        mode: 'sniper_trial',
        displayName: '狙擊手試煉',
        goldReward: 2000,
        levelKey: 'sniperTrialLevel',
        storageKey: 'cubeRPG_sniperTrialLevel',
        initLevelUps: 5,
        initLevel: 5,
        expBonus: 5 * 4,
        dropLogic: (level) => level % 5 === 0 ? 'uncommon' : 'common',
        description: (level, mult) => {
            let dropText = level % 5 === 0 ? "🎁 <span class='rarity-uncommon'>隨機精良裝備 x1</span>" : "🎁 <span class='rarity-common'>隨機普通裝備 x1</span>";
            return `這是 <strong>Lv.${level}</strong> 的狙擊手挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「狙擊手」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 2000 金幣<br>${dropText}`;
        },
        ui: {
            screenId: 'sniper-trial-screen',
            showBtnId: 'show-sniper-trial-btn',
            startBtnId: 'start-sniper-trial-btn',
            closeBtnId: 'close-sniper-trial-btn',
            lvlDisplayId: 'sniper-trial-lvl-display',
            descId: 'sniper-trial-desc'
        }
    },
    octopus: {
        mode: 'octopus_trial',
        displayName: '八爪魚試煉',
        goldReward: 3000,
        levelKey: 'octopusTrialLevel',
        storageKey: 'cubeRPG_octopusTrialLevel',
        initLevelUps: 5,
        initLevel: 5,
        expBonus: 5 * 4,
        dropLogic: () => Math.random() < 0.3 ? 'uncommon' : 'common',
        description: (level, mult) => {
            return `這是 <strong>Lv.${level}</strong> 的八爪魚挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「深淵八爪魚」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 3000 金幣<br>🎁 <span class='rarity-uncommon'>30%精良</span> / <span class='rarity-common'>70%普通</span> 隨機裝備 x1`;
        },
        ui: {
            screenId: 'octopus-trial-screen',
            showBtnId: 'show-octopus-trial-btn',
            startBtnId: 'start-octopus-trial-btn',
            closeBtnId: 'close-octopus-trial-btn',
            lvlDisplayId: 'octopus-trial-lvl-display',
            descId: 'octopus-trial-desc'
        }
    },
    summoner: {
        mode: 'summoner_trial',
        displayName: '招喚師試煉',
        goldReward: 2000,
        levelKey: 'summonerTrialLevel',
        storageKey: 'cubeRPG_summonerTrialLevel',
        initLevelUps: 5,
        initLevel: 5,
        expBonus: 5 * 4,
        dropLogic: () => {
            const r = Math.random();
            if (r < 0.33) return 'common';
            if (r < 0.66) return 'uncommon';
            return 'rare';
        },
        description: (level, mult) => {
            return `這是 <strong>Lv.${level}</strong> 的招喚師挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「招喚師」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 2000 金幣<br>🎁 <span class='rarity-common'>33%普通</span>/<span class='rarity-uncommon'>33%精良</span>/<span class='rarity-rare'>33%稀有</span> 隨機裝備 x1`;
        },
        ui: {
            screenId: 'summoner-trial-screen',
            showBtnId: 'show-summoner-trial-btn',
            startBtnId: 'start-summoner-trial-btn',
            closeBtnId: 'close-summoner-trial-btn',
            lvlDisplayId: 'summoner-trial-lvl-display',
            descId: 'summoner-trial-desc'
        }
    },
    twin: {
        mode: 'twin_trial',
        displayName: '雙子試煉',
        goldReward: 1000,
        levelKey: 'twinTrialLevel',
        storageKey: 'cubeRPG_twinTrialLevel',
        initLevelUps: 5,
        initLevel: 5,
        expBonus: 5 * 4,
        dropLogic: () => Math.random() < 0.95 ? 'uncommon' : 'rare',
        description: (level, mult) => {
            return `這是 <strong>Lv.${level}</strong> 的雙子挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，面對相連且會復活的雙子頭目。走位躲避藍彈，摧毀紅彈！必須在15秒內將兩者全數擊殺。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 1000 金幣<br>🎁 <span class='rarity-uncommon'>95%精良</span> / <span class='rarity-rare'>5%稀有</span> 隨機裝備 x1`;
        },
        ui: {
            screenId: 'twin-trial-screen',
            showBtnId: 'show-twin-trial-btn',
            startBtnId: 'start-twin-trial-btn',
            closeBtnId: 'close-twin-trial-btn',
            lvlDisplayId: 'twin-trial-lvl-display',
            descId: 'twin-trial-desc'
        }
    },
    prism: {
        mode: 'prism_trial',
        displayName: '棱鏡試煉',
        goldReward: 2000,
        levelKey: 'prismTrialLevel',
        storageKey: 'cubeRPG_prismTrialLevel',
        initLevelUps: 5,
        initLevel: 5,
        expBonus: 5 * 4,
        dropLogic: () => Math.random() < 0.5 ? 'common' : 'uncommon',
        description: (level, mult) => {
            return `這是 <strong>Lv.${level}</strong> 的棱鏡挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 5 次初始升級機會，然後直接與「棱鏡」對決。<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 2000 金幣<br>🎁 <span class='rarity-common'>50%普通</span>/<span class='rarity-uncommon'>50%精良</span> 隨機裝備 x1`;
        },
        ui: {
            screenId: 'prism-trial-screen',
            showBtnId: 'show-prism-trial-btn',
            startBtnId: 'start-prism-trial-btn',
            closeBtnId: 'close-prism-trial-btn',
            lvlDisplayId: 'prism-trial-lvl-display',
            descId: 'prism-trial-desc'
        }
    },
    chase: {
        mode: 'chase_trial',
        displayName: '追擊試煉',
        goldReward: 1500,
        levelKey: 'chaseTrialLevel',
        storageKey: 'cubeRPG_chaseTrialLevel',
        initLevelUps: 3,
        initLevel: 3,
        expBonus: 3 * 2,
        dropLogic: null,
        description: (level, mult) => {
            return `這是 <strong>Lv.${level}</strong> 的追擊挑戰。<br>敵人強度提升為 <strong>${mult.toFixed(1)} 倍</strong>！<br><br>你將獲得 3 次初始升級機會，然後面對 140 隻強化衝鋒方塊的猛攻。盡力存活！<br><br><span style="color:var(--gold); font-weight:bold;">【通關獎勵】</span><br>💰 1500 金幣`;
        },
        ui: {
            screenId: 'chase-trial-screen',
            showBtnId: 'show-chase-trial-btn',
            startBtnId: 'start-chase-trial-btn',
            closeBtnId: 'close-chase-trial-btn',
            lvlDisplayId: 'chase-trial-lvl-display',
            descId: 'chase-trial-desc'
        }
    }
};
const chapterData = [
    { id: 1, name: '第一章：方塊森林', multiplier: 1, hasBoss: true },
    { id: 2, name: '第二章：方塊之海', multiplier: 3, hasBoss: true },
    { id: 3, name: '第三章：機械遺跡', multiplier: 5, hasBoss: true }
];
let playerInventory = JSON.parse(localStorage.getItem('cubeRPG_inventory')) || [];
let playerEquipment = JSON.parse(localStorage.getItem('cubeRPG_equipment')) || {
    weapon: null, helmet: null, armor: null, boots: null, ring: null, amulet: null
};
let runDrops = []; 
const slotNames = { 
    weapon: '武器', 
    helmet: '頭盔', 
    armor: '盔甲', 
    boots: '鞋子', 
    ring: '戒指', 
    amulet: '護身符' 
};
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
    },
    octopusBoss: { 
        name: '深淵八爪魚', 
        desc: '會發射8方位的S型彈幕。低血量時會釋放擊退衝擊波，甚至開啟吸血模式！',
        color: '#8b008b', size: 75, hp: 35000, speed: 1.8, damage: 25, exp: 150 
    },
    summonerBoss: { 
        name: '招喚師', 
        desc: '會持續召喚自殺式方塊，並透過核心矩陣保護自己。小心它的電磁脈衝！',
        color: '#00FFFF', size: 70, hp: 45000, speed: 1.5, damage: 30, exp: 200 
    },
    twinBossRed: {
        name: '紅色雙子', 
        desc: '雙子頭目之一。發射可被摧毀的追蹤吸血彈，與藍色雙子保持雷射連線。',
        color: '#ff4d4d', size: 60, hp: 28000, speed: 1.5, damage: 30, exp: 150
    },
    twinBossBlue: {
        name: '藍色雙子', 
        desc: '雙子頭目之一。發射降低移動速度的藍色彈幕，與紅色雙子保持雷射連線。',
        color: '#4d4dff', size: 60, hp: 28000, speed: 1.5, damage: 30, exp: 150
    },
    suicideMinion: {
        name: '自殺式方塊',
        desc: '被召喚出的不穩定能量體，會衝向目標並引爆。',
        color: '#FF5733', size: 15, hp: 1, speed: 4.7, damage: 0, exp: 0
    },
    summonerCore: {
        name: '防禦核心',
        desc: '保護著招喚師本體。',
        color: '#FFFFFF', size: 20, hp: 2000, speed: 0, damage: 10, exp: 0
    },
    prismBoss: {
        name: '棱鏡',
        desc: '隨機出招的雷射系頭目，會使用多種雷射攻擊。',
        color: '#ff44ff', size: 70, hp: 35000, speed: 0, damage: 30, exp: 200
    }
};
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
window.MAX_CUBE_LEVEL = 50;
window.MAX_PLAYER_SPEED = 12;
