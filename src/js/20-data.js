/* ================= data ================= */
const WAVES = 8, WAVE_DUR = 25;
const WDEF = {
  pulse:   { name: '脉冲爆弹', tag: '弹射', mech: '子弹可在墙壁间弹跳，每次弹跳伤害提高 25%。',
             lv: ['每发子弹可弹跳 2 次', '可弹跳 3 次，并穿透 1 个敌人'],
             cd: 0.36, dmg: 9, spd: 600, col: '#7be8ff', price: 12 },
  shotgun: { name: '彩纸霰弹枪', tag: '保龄球', mech: '击中的敌人会像保龄球一样飞出，撞倒其他敌人。',
             lv: ['被击飞的敌人撞击后会炸成彩纸', '击飞力度翻倍'],
             cd: 0.85, dmg: 6, pellets: 5, spread: 0.55, spd: 520, range: 0.42, col: '#ffe27a', price: 16 },
  chime:   { name: '钟声炸弹', tag: '连锁', mech: '爆炸击败敌人后会引发新的爆炸，连锁不断增强！',
             lv: ['爆炸范围更大、威力更强', '返场：连锁中的首次击败会引发双重爆炸'],
             cd: 1.15, dmg: 16, spd: 430, R: 64, col: '#ff8fc7', price: 22 },
  boomer:  { name: '回旋镖', tag: '磁力', mech: '飞出时会把敌人吸到一起，回程时也能造成伤害。',
             lv: ['牵引力更强，范围更广', '飞到最远处悬停，并大幅增强牵引力'],
             cd: 1.0, dmg: 11, spd: 380, range: 240, col: '#8ff0a4', price: 18 }
};
const DMGM = [1, 1.55, 2.3], CDM = [1, 0.9, 0.8], RM = [1, 1.15, 1.3];
const ET = {
  blob:    { hp: 12, spd: 64,  r: 13, dmg: 5, val: 1, col: '#ff9ccf' },
  zippy:   { hp: 7,  spd: 125, r: 10, dmg: 4, val: 1, col: '#7be8ff' },
  chunk:   { hp: 55, spd: 44,  r: 21, dmg: 9, val: 3, col: '#8ff0a4' },
  spitter: { hp: 20, spd: 52,  r: 13, dmg: 6, val: 2, col: '#ffe27a' },
  king:    { hp: 2200, spd: 46, r: 56, dmg: 12, val: 30, col: '#c9a0ff' }
};
const UPS = [
  { id: 'dmg',   name: '甜蜜火力', desc: '伤害提高 12%',            cost: 10, icon: 'star',   apply: () => { stats.dmg *= 1.12; } },
  { id: 'rate',  name: '疾速爪爪', desc: '射速提高 12%',            cost: 10, icon: 'bolt',   apply: () => { stats.rate *= 1.12; } },
  { id: 'hp',    name: '暖心守护', desc: '最大生命值提高 20',        cost: 9,  icon: 'heart',  apply: () => { stats.maxHp += 20; P.hp += 20; } },
  { id: 'spd',   name: '蓬松靴子', desc: '移动速度提高 8%',          cost: 8,  icon: 'boot',   apply: () => { stats.speed *= 1.08; } },
  { id: 'blast', name: '爆炸升级', desc: '爆炸范围扩大 20%',         cost: 11, icon: 'ring',   req: 'chime', apply: () => { stats.blast *= 1.2; } },
  { id: 'chain', name: '回声',     desc: '连锁爆炸的伤害和范围提高', cost: 12, icon: 'echo',   req: 'chime', apply: () => { stats.chain += 1; } },
  { id: 'regen', name: '茶歇时光', desc: '每秒恢复 0.8 点生命值',    cost: 10, icon: 'cup',    apply: () => { stats.regen += 0.8; } },
  { id: 'heal',  name: '能量点心', desc: '恢复 40 点生命值',         cost: 6,  icon: 'plus',   apply: () => { P.hp = Math.min(stats.maxHp, P.hp + 40); } },
  { id: 'bank',  name: '弹墙一击', desc: '脉冲爆弹：额外弹跳 1 次', cost: 11, icon: 'bounce', req: 'pulse',   apply: () => { stats.bounce += 1; } },
  { id: 'heavy', name: '重击手',   desc: '彩纸霰弹枪：击飞力度提高 40%', cost: 11, icon: 'bowl', req: 'shotgun', apply: () => { stats.launch *= 1.4; } },
  { id: 'grav',  name: '引力增强', desc: '回旋镖：牵引力提高 40%',  cost: 11, icon: 'swirl',  req: 'boomer',  apply: () => { stats.pull *= 1.4; } },
  { id: 'mag',   name: '磁力增强', desc: '拾取范围扩大 50%',        cost: 7,  icon: 'magnet', apply: () => { stats.magnet *= 1.5; } }
];

