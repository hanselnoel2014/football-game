// ═══════════════════════════════════════════════════════════════
//  RETRO FOOTBALL  —  Season Teams + Player Picker
// ═══════════════════════════════════════════════════════════════

// ─── Layout ──────────────────────────────────────────────────────
const CANVAS_W    = 1100;
const CANVAS_H    = 680;
const ENDZONE_W   = 90;
const FIELD_LEFT  = ENDZONE_W;
const FIELD_RIGHT = CANVAS_W - ENDZONE_W;
const FIELD_TOP   = 50;
const FIELD_BOTTOM= CANVAS_H - 50;
const FIELD_W     = FIELD_RIGHT - FIELD_LEFT;
const FIELD_H     = FIELD_BOTTOM - FIELD_TOP;
const YARD_STEP   = FIELD_W / 10;
const PW = 26, PH = 30;

// ─── Player Roster (choosable) ───────────────────────────────────
const PLAYER_OPTIONS = [
    { label:'BLUE BOLT',   color:'#4fc3f7', helmetColor:'#0277bd', pantsColor:'#0d47a1', num:'1' },
    { label:'RED ROCKET',  color:'#ef9a9a', helmetColor:'#b71c1c', pantsColor:'#7f0000', num:'7' },
    { label:'GREEN GHOST', color:'#a5d6a7', helmetColor:'#2e7d32', pantsColor:'#1b5e20', num:'8' },
    { label:'GOLD FLASH',  color:'#fff176', helmetColor:'#f57f17', pantsColor:'#e65100', num:'9' },
    { label:'PURPLE ACE',  color:'#ce93d8', helmetColor:'#6a1b9a', pantsColor:'#4a148c', num:'5' },
    { label:'WHITE WOLF',  color:'#eeeeee', helmetColor:'#616161', pantsColor:'#212121', num:'0' },
];

// chosen index, set by picker
let chosenPlayerIdx = 0;

// ─── Season Definitions ──────────────────────────────────────────
// Each season has its own opposing team jersey + escalating difficulty
const SEASONS = [
    {
        name: 'SPRING',
        sky: ['#87CEEB','#b0e0ff'],
        fieldMain: '#3a9c3a', endzone: '#1a5c1a',
        crowd: '#a8d5a2', treeFill: '#4CAF50', treeStroke: '#2e7d32',
        // Opponent: Spring Vipers — teal/lime
        defColor: '#69f0ae', defHelmet: '#00695c', defPants: '#004d40',
        defName: 'VIPERS',
        defSpeedMult: 0.60,   // fraction of player speed
        defChaseRange: 280,
    },
    {
        name: 'SUMMER',
        sky: ['#ff8c00','#ffcc44'],
        fieldMain: '#388e3c', endzone: '#1b5e20',
        crowd: '#ffe082', treeFill: '#66BB6A', treeStroke: '#33691e',
        // Opponent: Summer Blazers — orange/yellow
        defColor: '#ffb300', defHelmet: '#e65100', defPants: '#bf360c',
        defName: 'BLAZERS',
        defSpeedMult: 0.70,
        defChaseRange: 310,
    },
    {
        name: 'AUTUMN',
        sky: ['#8B4513','#d2691e'],
        fieldMain: '#5d8a3c', endzone: '#3d5e28',
        crowd: '#ff8f00', treeFill: '#e65100', treeStroke: '#bf360c',
        // Opponent: Autumn Raiders — dark brown/crimson
        defColor: '#bf360c', defHelmet: '#4e342e', defPants: '#3e2723',
        defName: 'RAIDERS',
        defSpeedMult: 0.80,
        defChaseRange: 340,
    },
    {
        name: 'WINTER',
        sky: ['#b0c4de','#e8eaf6'],
        fieldMain: '#a5c9a5', endzone: '#6b9a6b',
        crowd: '#e3f2fd', treeFill: '#78909C', treeStroke: '#455A64',
        // Opponent: Winter Wolves — icy silver/navy
        defColor: '#90a4ae', defHelmet: '#263238', defPants: '#1c313a',
        defName: 'WOLVES',
        defSpeedMult: 0.90,
        defChaseRange: 380,
    },
];

// ─── Game State ──────────────────────────────────────────────────
let canvas, ctx, frameId;
let keys = {}, spaceConsumed = false;
// 'picker' | 'playing' | 'over'
let phase = 'picker';
let score = 0, level = 1, seasonIdx = 0;
let player = null, teammates = [], defenders = [];
let carrier = null, defMode = false;
let flyBall = null, popups = [];
let tackleCooldown = 0;

// ─── Bootstrap ───────────────────────────────────────────────────
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx    = canvas.getContext('2d');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   e => { keys[e.key] = false; });

    buildPicker();
    document.getElementById('startBtn').addEventListener('click', startGame);

    renderIdle();
});

// ─── Player Picker UI ────────────────────────────────────────────
function buildPicker() {
    const container = document.getElementById('picker-cards');
    container.innerHTML = '';
    PLAYER_OPTIONS.forEach((opt, i) => {
        const card = document.createElement('div');
        card.className = 'picker-card' + (i === chosenPlayerIdx ? ' selected' : '');
        card.dataset.idx = i;

        // Mini canvas preview
        const cv = document.createElement('canvas');
        cv.width = 56; cv.height = 64;
        const c2 = cv.getContext('2d');
        drawMiniPlayer(c2, opt);
        card.appendChild(cv);

        const lbl = document.createElement('span');
        lbl.textContent = opt.label;
        card.appendChild(lbl);

        card.addEventListener('click', () => {
            chosenPlayerIdx = i;
            document.querySelectorAll('.picker-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });

        container.appendChild(card);
    });
}

function drawMiniPlayer(c2, opt) {
    const x = 8, y = 4, w = PW + 10, h = PH + 10;
    const pcx = x + w/2;

    // Shadow
    c2.fillStyle = 'rgba(0,0,0,0.18)';
    c2.beginPath(); c2.ellipse(pcx, y+h+2, w*0.4, 4, 0, 0, Math.PI*2); c2.fill();

    // Body
    c2.fillStyle = opt.color;
    miniRRect(c2, x+4, y+11, w-8, h-15, 4); c2.fill();

    // Shoulder pads
    c2.fillStyle = '#b2ebf2';
    c2.fillRect(x, y+11, 7, 9); c2.fillRect(x+w-7, y+11, 7, 9);

    // Number
    c2.fillStyle = '#fff';
    c2.font = "bold 8px 'Press Start 2P', monospace";
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(opt.num, pcx, y + h/2 + 3);

    // Helmet
    c2.fillStyle = opt.helmetColor;
    miniRRect(c2, x+3, y, w-6, 15, 7); c2.fill();

    // Stripe
    c2.fillStyle = 'rgba(255,255,255,0.35)';
    c2.fillRect(pcx-1.5, y+1, 3, 12);

    // Legs
    c2.fillStyle = opt.pantsColor;
    c2.fillRect(x+4, y+h-9, 7, 9);
    c2.fillRect(x+w-11, y+h-9, 7, 9);
}

function miniRRect(c2, x, y, w, h, r) {
    c2.beginPath();
    c2.moveTo(x+r, y);
    c2.lineTo(x+w-r, y); c2.quadraticCurveTo(x+w,y,x+w,y+r);
    c2.lineTo(x+w,y+h-r); c2.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c2.lineTo(x+r,y+h); c2.quadraticCurveTo(x,y+h,x,y+h-r);
    c2.lineTo(x,y+r); c2.quadraticCurveTo(x,y,x+r,y);
    c2.closePath();
}

function onKeyDown(e) {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (e.key === ' ' && !spaceConsumed && phase === 'playing') {
        spaceConsumed = true;
        tryPass();
    }
}

// ─── Start Game ──────────────────────────────────────────────────
function startGame() {
    document.getElementById('overlay').style.display = 'none';

    seasonIdx = Math.floor(score / 100) % 4;
    const s   = SEASONS[seasonIdx];
    const opt = PLAYER_OPTIONS[chosenPlayerIdx];

    const spd    = 3.0 + (level - 1) * 0.12;
    const defSpd = spd * s.defSpeedMult;

    // QB — use chosen player colors
    player = makePlayer(
        FIELD_LEFT + YARD_STEP,
        FIELD_TOP + FIELD_H / 2,
        opt.color, opt.helmetColor, opt.pantsColor, opt.num, spd
    );

    // Teammates — lighter shade of player color
    const tmColor  = lighten(opt.color, 0.18);
    const tmHelmet = opt.helmetColor;
    teammates = [
        makePlayer(FIELD_LEFT + YARD_STEP*1.5, FIELD_TOP + FIELD_H*0.22, tmColor, tmHelmet, opt.pantsColor, '2', spd),
        makePlayer(FIELD_LEFT + YARD_STEP*1.5, FIELD_TOP + FIELD_H*0.50, tmColor, tmHelmet, opt.pantsColor, '3', spd),
        makePlayer(FIELD_LEFT + YARD_STEP*1.5, FIELD_TOP + FIELD_H*0.78, tmColor, tmHelmet, opt.pantsColor, '4', spd),
    ];

    // Defenders — season-specific colors + difficulty
    defenders = [
        makePlayer(FIELD_LEFT + YARD_STEP*5.5, FIELD_TOP + FIELD_H*0.20, s.defColor, s.defHelmet, s.defPants, 'D', defSpd),
        makePlayer(FIELD_LEFT + YARD_STEP*6.5, FIELD_TOP + FIELD_H*0.42, s.defColor, s.defHelmet, s.defPants, 'D', defSpd),
        makePlayer(FIELD_LEFT + YARD_STEP*7.5, FIELD_TOP + FIELD_H*0.65, s.defColor, s.defHelmet, s.defPants, 'D', defSpd),
        makePlayer(FIELD_LEFT + YARD_STEP*5.0, FIELD_TOP + FIELD_H*0.82, s.defColor, s.defHelmet, s.defPants, 'D', defSpd),
    ];

    [...teammates, ...defenders].forEach(p => resetWP(p));

    carrier = player; defMode = false;
    flyBall = null; popups = []; tackleCooldown = 0;
    phase   = 'playing';

    // Show opponent intro popup
    popup(`VS ${s.defName}!`, CANVAS_W/2, FIELD_TOP + FIELD_H/2, s.defColor);

    updateHUD();
    if (frameId) cancelAnimationFrame(frameId);
    loop();
}

function makePlayer(x, y, color, helmetColor, pantsColor, num, speed) {
    return {
        x: x - PW/2, y: y - PH/2,
        w: PW, h: PH,
        color, helmetColor, pantsColor, num, speed,
        facing: 1, anim: 0,
        wpX: x, wpY: y, wpTimer: Math.random() * 80,
    };
}

function resetWP(p) {
    p.wpTimer = 60 + Math.random() * 120;
    p.wpX = FIELD_LEFT + Math.random() * FIELD_W;
    p.wpY = FIELD_TOP  + Math.random() * FIELD_H;
}

// Simple color lightener — blends toward white
function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + Math.round(255 * amt));
    const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
    const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// ─── Loop ────────────────────────────────────────────────────────
function loop() {
    if (phase !== 'playing') return;
    update();
    render();
    frameId = requestAnimationFrame(loop);
}

// ─── Update ──────────────────────────────────────────────────────
function update() {
    if (tackleCooldown > 0) tackleCooldown--;
    moveControlled();
    moveAITeammates();
    moveAIDefenders();
    advanceFlyBall();
    checkTackles();
    checkEndzone();
    updateYards();
    tickPopups();
}

function moveControlled() {
    const p = defMode ? player : (carrier || player);
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) { dx -= p.speed; p.facing = -1; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx += p.speed; p.facing =  1; }
    if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= p.speed;
    if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += p.speed;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    p.x = clamp(p.x + dx, 0, CANVAS_W - p.w);
    p.y = clamp(p.y + dy, FIELD_TOP, FIELD_BOTTOM - p.h);
    if (dx || dy) p.anim++;
    if (!keys[' ']) spaceConsumed = false;
}

function moveAITeammates() {
    teammates.forEach(t => {
        if (!defMode && t === carrier) return;
        t.wpTimer--;
        if (t.wpTimer <= 0) resetWP(t);
        const ang = Math.atan2(t.wpY - cy(t), t.wpX - cx(t));
        t.x = clamp(t.x + Math.cos(ang) * t.speed * 0.7, FIELD_LEFT, FIELD_RIGHT - t.w);
        t.y = clamp(t.y + Math.sin(ang) * t.speed * 0.7, FIELD_TOP,  FIELD_BOTTOM - t.h);
        t.facing = Math.cos(ang) >= 0 ? 1 : -1;
        t.anim++;
    });
}

function moveAIDefenders() {
    const s = SEASONS[seasonIdx];
    defenders.forEach(d => {
        // Defense carrier runs back to left endzone
        if (defMode && d === carrier) {
            const ang = Math.atan2((FIELD_TOP + FIELD_H/2) - cy(d), 0 - cx(d));
            d.x = clamp(d.x + Math.cos(ang) * d.speed, 0, CANVAS_W - d.w);
            d.y = clamp(d.y + Math.sin(ang) * d.speed, FIELD_TOP, FIELD_BOTTOM - d.h);
            d.facing = -1; d.anim++; return;
        }
        if (!defMode) {
            const tgt = carrier || player;
            const dst = rawDist(cx(d), cy(d), cx(tgt), cy(tgt));
            if (dst < s.defChaseRange) {
                const ang = Math.atan2(cy(tgt) - cy(d), cx(tgt) - cx(d));
                d.x = clamp(d.x + Math.cos(ang) * d.speed, FIELD_LEFT, FIELD_RIGHT - d.w);
                d.y = clamp(d.y + Math.sin(ang) * d.speed, FIELD_TOP,  FIELD_BOTTOM - d.h);
                d.facing = Math.cos(ang) >= 0 ? 1 : -1;
            } else {
                d.wpTimer--;
                if (d.wpTimer <= 0) resetWP(d);
                const ang = Math.atan2(d.wpY - cy(d), d.wpX - cx(d));
                d.x = clamp(d.x + Math.cos(ang) * d.speed * 0.5, FIELD_LEFT, FIELD_RIGHT - d.w);
                d.y = clamp(d.y + Math.sin(ang) * d.speed * 0.5, FIELD_TOP,  FIELD_BOTTOM - d.h);
                d.facing = Math.cos(ang) >= 0 ? 1 : -1;
            }
        } else {
            d.wpTimer--;
            if (d.wpTimer <= 0) resetWP(d);
            const ang = Math.atan2(d.wpY - cy(d), d.wpX - cx(d));
            d.x = clamp(d.x + Math.cos(ang) * d.speed * 0.5, FIELD_LEFT, FIELD_RIGHT - d.w);
            d.y = clamp(d.y + Math.sin(ang) * d.speed * 0.5, FIELD_TOP,  FIELD_BOTTOM - d.h);
            d.facing = Math.cos(ang) >= 0 ? 1 : -1;
        }
        d.anim++;
    });
}

// ─── Pass ────────────────────────────────────────────────────────
function tryPass() {
    if (flyBall || defMode || !carrier) return;
    const passer = carrier;
    const others = [player, ...teammates].filter(t => t !== passer);
    let best = null, bestD = Infinity;
    for (const t of others) {
        if (laneBlocked(passer, t)) continue;
        const d = dist2(passer, t) + (t.x > passer.x ? 0 : 120);
        if (d < bestD) { bestD = d; best = t; }
    }
    if (!best) { popup('BLOCKED!', cx(passer), cy(passer)-24, '#ff5252'); return; }
    carrier = null;
    flyBall = { x: cx(passer), y: cy(passer)-6, tx: cx(best), ty: cy(best), targetObj: best, speed: 9, spin: 0 };
    popup('PASS!', cx(passer), cy(passer)-38, '#80cbc4');
}

function laneBlocked(from, to) {
    for (const d of defenders)
        if (nearSegment(cx(d), cy(d), cx(from), cy(from), cx(to), cy(to), 38)) return true;
    return false;
}

function advanceFlyBall() {
    if (!flyBall) return;
    const ang = Math.atan2(flyBall.ty - flyBall.y, flyBall.tx - flyBall.x);
    flyBall.x += Math.cos(ang) * flyBall.speed;
    flyBall.y += Math.sin(ang) * flyBall.speed;
    flyBall.spin += 0.28;
    if (rawDist(flyBall.x, flyBall.y, flyBall.tx, flyBall.ty) < flyBall.speed + 4) {
        carrier = flyBall.targetObj;
        flyBall = null;
        popup('CAUGHT! 🏈', cx(carrier), cy(carrier)-22, '#f5c518');
    }
}

// ─── Tackles ─────────────────────────────────────────────────────
function checkTackles() {
    if (tackleCooldown > 0 || flyBall) return;
    if (!defMode) {
        if (!carrier) return;
        for (const d of defenders) {
            if (overlap(carrier, d)) {
                carrier = d; defMode = true; tackleCooldown = 60;
                popup('TURNOVER! 💥', cx(d), cy(d)-22, '#ff5252');
                popup('TACKLE THEM!', CANVAS_W/2, FIELD_TOP+60, '#f5c518');
                return;
            }
        }
    } else {
        if (!carrier) return;
        for (const t of [player, ...teammates]) {
            if (overlap(t, carrier)) {
                carrier = player; defMode = false; tackleCooldown = 60;
                popup('RECOVERED! 🏈', cx(t), cy(t)-22, '#80cbc4');
                return;
            }
        }
    }
}

// ─── Endzones ────────────────────────────────────────────────────
function checkEndzone() {
    if (flyBall || !carrier) return;
    if (!defMode && carrier.x + carrier.w >= FIELD_RIGHT) {
        score += 6;
        level = Math.floor(score / 100) + 1;
        seasonIdx = Math.floor(score / 100) % 4;
        updateHUD();
        popup('TOUCHDOWN! 🏈', cx(carrier), cy(carrier)-30, '#f5c518');
        endPlay('TOUCHDOWN! 🏈', `+6 pts  ·  Score: ${score}  ·  Level: ${level}  ·  Season: ${SEASONS[seasonIdx].name}`, 'NEXT PLAY');
    } else if (defMode && carrier.x <= 0) {
        popup('PICK SIX! 😱', cx(carrier), cy(carrier)-22, '#ff5252');
        endPlay('PICK SIX! 😱', `They scored!  ·  Score: ${score}  ·  Level: ${level}`, 'TRY AGAIN');
    }
}

function endPlay(title, msg, btn) {
    phase = 'over';
    setTimeout(() => showOverlay(title, msg, btn), 600);
}

// ─── HUD / Yards ─────────────────────────────────────────────────
function updateYards() {
    const ref = carrier || player;
    document.getElementById('yards').textContent = Math.max(0, Math.floor(((ref.x - (FIELD_LEFT + YARD_STEP)) / FIELD_W) * 100));
}

function updateHUD() {
    const s = SEASONS[seasonIdx];
    document.getElementById('score').textContent  = score;
    document.getElementById('level').textContent  = level;
    document.getElementById('season').textContent = s.name;
    document.getElementById('opponent').textContent = s.defName;
}

// ─── Popups ──────────────────────────────────────────────────────
function popup(text, x, y, color) { popups.push({ text, x, y, color, life: 90, max: 90 }); }
function tickPopups() { popups = popups.filter(p => p.life-- > 0); }

// ─── Render ──────────────────────────────────────────────────────
function render() {
    const s = SEASONS[seasonIdx];
    drawBg(s);
    drawField(s);
    drawGoalPost();
    teammates.forEach(t => drawSprite(t, 'off'));
    defenders.forEach(d => drawSprite(d, 'def'));
    drawSprite(player, 'player');
    if (carrier) drawBallCarried(carrier);
    if (flyBall)  drawBallFlying(flyBall);
    drawPopups();
}

// ─── Background ──────────────────────────────────────────────────
function drawBg(s) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD_TOP);
    g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = s.crowd;
    ctx.fillRect(0, 0, CANVAS_W, FIELD_TOP);
    ctx.fillRect(0, FIELD_BOTTOM, CANVAS_W, CANVAS_H - FIELD_BOTTOM);

    const cc = ['#fff','#ffcc00','#ff6b6b','#74b9ff', s.crowd];
    for (let i = 0; i < CANVAS_W; i += 16) {
        ctx.fillStyle = cc[(i/16|0) % cc.length];
        ctx.fillRect(i, 4, 10, 14);
        ctx.fillStyle = '#c8a882';
        ctx.beginPath(); ctx.arc(i+5, 6, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cc[((i/16|0)+2) % cc.length];
        ctx.fillRect(i, FIELD_BOTTOM+8, 10, 14);
        ctx.fillStyle = '#c8a882';
        ctx.beginPath(); ctx.arc(i+5, FIELD_BOTTOM+10, 4, 0, Math.PI*2); ctx.fill();
    }

    [[14,FIELD_TOP+8,20],[44,FIELD_TOP+4,16],[CANVAS_W-18,FIELD_TOP+8,20],[CANVAS_W-48,FIELD_TOP+4,16]].forEach(([tx,ty,sz])=>{
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(tx-3, ty+sz*0.55, 6, sz*0.5);
        ctx.fillStyle = s.treeFill; ctx.strokeStyle = s.treeStroke; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx, ty, sz*0.52, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });
}

// ─── Field ───────────────────────────────────────────────────────
function drawField(s) {
    ctx.fillStyle = s.endzone;
    ctx.fillRect(0, FIELD_TOP, ENDZONE_W, FIELD_H);
    ctx.fillRect(FIELD_RIGHT, FIELD_TOP, ENDZONE_W, FIELD_H);

    ctx.fillStyle = s.fieldMain;
    ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);

    for (let i = 0; i < 10; i += 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(FIELD_LEFT + i*YARD_STEP, FIELD_TOP, YARD_STEP, FIELD_H);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
        const x = FIELD_LEFT + i*YARD_STEP;
        ctx.beginPath(); ctx.moveTo(x, FIELD_TOP); ctx.lineTo(x, FIELD_BOTTOM); ctx.stroke();
    }

    ctx.save();
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center';
    [10,20,30,40,50,40,30,20,10].forEach((n,i) => {
        const x = FIELD_LEFT + (i+1)*YARD_STEP;
        ctx.fillText(n, x, FIELD_TOP+18); ctx.fillText(n, x, FIELD_BOTTOM-6);
    });
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
    const h1 = FIELD_TOP + FIELD_H*0.33, h2 = FIELD_TOP + FIELD_H*0.66;
    for (let i = 0; i <= 10; i++) {
        const bx = FIELD_LEFT + i*YARD_STEP;
        for (let j = 1; j < 5; j++) {
            const mx = bx + j*YARD_STEP/5;
            ctx.beginPath(); ctx.moveTo(mx, h1-5); ctx.lineTo(mx, h1+5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mx, h2-5); ctx.lineTo(mx, h2+5); ctx.stroke();
        }
    }

    ctx.save();
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center';
    ctx.save(); ctx.translate(ENDZONE_W/2, FIELD_TOP+FIELD_H/2); ctx.rotate(-Math.PI/2); ctx.fillText('END ZONE',0,0); ctx.restore();
    ctx.save(); ctx.translate(FIELD_RIGHT+ENDZONE_W/2, FIELD_TOP+FIELD_H/2); ctx.rotate(Math.PI/2); ctx.fillText('END ZONE',0,0); ctx.restore();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    ctx.strokeRect(0, FIELD_TOP, CANVAS_W, FIELD_H);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(FIELD_RIGHT, FIELD_TOP); ctx.lineTo(FIELD_RIGHT, FIELD_BOTTOM); ctx.stroke();

    // Opponent name tag
    const s2 = SEASONS[seasonIdx];
    ctx.save();
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = s2.defColor;
    ctx.textAlign = 'right';
    ctx.fillText(`VS ${s2.defName}`, CANVAS_W - 8, CANVAS_H - 8);
    ctx.restore();
}

// ─── Goal Post ───────────────────────────────────────────────────
function drawGoalPost() {
    const px = FIELD_RIGHT + ENDZONE_W - 16;
    const by = FIELD_BOTTOM - 4, cY = by - 110, cW = 56, upH = 50;
    ctx.save();
    ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = '#f5c518'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(px, by);    ctx.lineTo(px, cY);        ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px-cW, cY); ctx.lineTo(px+cW, cY);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px-cW, cY); ctx.lineTo(px-cW, cY-upH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+cW, cY); ctx.lineTo(px+cW, cY-upH); ctx.stroke();
    ctx.restore();
}

// ─── Sprite ──────────────────────────────────────────────────────
function drawSprite(p, role) {
    ctx.save();
    const { x, y, w, h, facing, anim } = p;
    const pcx = x+w/2, pcy = y+h/2;
    const leg = Math.sin(anim*0.22)*3;

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(pcx, y+h+2, w*0.4, 4, 0, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = p.color;
    rRect(x+4, y+11, w-8, h-15, 4); ctx.fill();

    // Shoulder pads
    ctx.fillStyle = role === 'def' ? lighten(p.color, 0.2) : '#b2ebf2';
    ctx.fillRect(x, y+11, 7, 9); ctx.fillRect(x+w-7, y+11, 7, 9);

    ctx.fillStyle = '#fff';
    ctx.font = "bold 7px 'Press Start 2P', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.num, pcx, pcy+3);

    ctx.fillStyle = p.helmetColor;
    rRect(x+3, y, w-6, 15, 7); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(pcx-1.5, y+1, 3, 12);

    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
    const mBase = facing===1 ? x+w-10 : x+3;
    ctx.beginPath(); ctx.moveTo(mBase, y+4); ctx.lineTo(mBase+facing*6, y+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mBase, y+9); ctx.lineTo(mBase+facing*6, y+9); ctx.stroke();

    ctx.fillStyle = p.pantsColor || (role==='def' ? '#7f0000' : role==='player' ? '#0d47a1' : '#00695c');
    ctx.fillRect(x+4,    y+h-9, 7, 9+leg);
    ctx.fillRect(x+w-11, y+h-9, 7, 9-leg);

    if (p === carrier) {
        ctx.fillStyle = '#f5c518'; ctx.font = '11px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('★', pcx, y-4);
    }
    ctx.restore();
}

// ─── Ball ────────────────────────────────────────────────────────
function drawBallCarried(c) { drawFootball(c.x+c.w-2, c.y+c.h*0.42, 0.42, 0); }
function drawBallFlying(fb) { drawFootball(fb.x, fb.y, 1, fb.spin); }
function drawFootball(x, y, scale, rot) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(scale,scale);
    ctx.fillStyle = '#8B4513'; ctx.strokeStyle = '#5d2e0c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0,0,11,7,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    [-2,0,2].forEach(ox=>{ ctx.beginPath(); ctx.moveTo(ox,-3); ctx.lineTo(ox,3); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-3,0); ctx.lineTo(3,0); ctx.stroke();
    ctx.restore();
}

// ─── Popups draw ─────────────────────────────────────────────────
function drawPopups() {
    popups.forEach(p => {
        const a = p.life/p.max;
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.fillStyle = p.color; ctx.textAlign = 'center';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(p.text, p.x, p.y-(1-a)*28);
        ctx.restore();
    });
}

// ─── Overlay ─────────────────────────────────────────────────────
function showOverlay(title, msg, btn) {
    const ov = document.getElementById('overlay');
    ov.querySelector('h2').textContent = title;
    ov.querySelector('p').textContent  = msg;
    ov.querySelector('button').textContent = btn;
    ov.style.display = 'flex';
}

// ─── Idle draw ───────────────────────────────────────────────────
function renderIdle() {
    canvas.width = CANVAS_W; canvas.height = CANVAS_H;
    const s = SEASONS[0];
    const g = ctx.createLinearGradient(0,0,0,CANVAS_H);
    g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
    ctx.fillStyle = s.fieldMain;
    ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
    for (let i=0; i<=10; i++) {
        const x = FIELD_LEFT + i*YARD_STEP;
        ctx.beginPath(); ctx.moveTo(x,FIELD_TOP); ctx.lineTo(x,FIELD_BOTTOM); ctx.stroke();
    }
}

// ─── Utils ───────────────────────────────────────────────────────
function cx(p) { return p.x + p.w/2; }
function cy(p) { return p.y + p.h/2; }
function clamp(v,lo,hi) { return Math.max(lo, Math.min(hi,v)); }
function dist2(a,b) { return Math.hypot(cx(a)-cx(b), cy(a)-cy(b)); }
function rawDist(ax,ay,bx,by) { return Math.hypot(ax-bx, ay-by); }

function overlap(a,b) {
    const m=4;
    return a.x+m < b.x+b.w-m && a.x+a.w-m > b.x+m &&
           a.y+m < b.y+b.h-m && a.y+a.h-m > b.y+m;
}

function nearSegment(px,py,ax,ay,bx,by,thresh) {
    const dx=bx-ax, dy=by-ay, len=dx*dx+dy*dy;
    if (!len) return rawDist(px,py,ax,ay)<thresh;
    const t = clamp(((px-ax)*dx+(py-ay)*dy)/len,0,1);
    return rawDist(px,py,ax+t*dx,ay+t*dy)<thresh;
}

function rRect(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
}
