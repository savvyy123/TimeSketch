let points = [];

// A3印刷用の定数
const A3_WIDTH_MM = 297;
const A3_HEIGHT_MM = 420;
const DPI = 200;
const INCH_PER_MM = 1 / 25.4;
const A3_WIDTH_PX = Math.round(A3_WIDTH_MM * INCH_PER_MM * DPI); // 3508px
const A3_HEIGHT_PX = Math.round(A3_HEIGHT_MM * INCH_PER_MM * DPI); // 4961px

const SOUND_FILES = [
    "17.40.mp3",
    "17.43.mp3",
    "17.46.mp3",
    "18.55.mp3",
    "19.00.mp3",
    "19.05.mp3",
    "20.10.mp3",
    "20.28.mp3",
    "20.35.mp3",
    "20.41.mp3",
];
const SOUND_ENTRIES = SOUND_FILES.map(name => {
    const m = name.match(/(\d+)\.(\d+)/);
    const h = parseInt(m[1]);
    const min = parseInt(m[2]);
    return {
        time: `${h}時${min.toString().padStart(2, "0")}分`,
        file: `sounds/${name}`,
        minutes: h * 60 + min,
    };
});

let sounds = [];
let currentSound = null;
let stopTimer = null;
let fadeOutTimer = null;
let newSound641 = null; // 新規録音 641.mp3用
const CLIP_DURATION = 10; // 10秒に変更
const FADE_DURATION = 1.5;
const HIT_RADIUS = 60;
const CLOCK_RADIUS = 50;
const DOT_SIZE = 5;
const DOT_SPACING = 7;
const POST_MIDNIGHT_INK = 172;

// 長い線(時計同士の間が大きい線)にだけパーリンノイズを乗せる
const LONG_LINE_THRESHOLD = 350; // この長さを超える線にノイズ適用
const NOISE_SCALE = 0.012;       // 座標→noise入力のスケール(小さいほど大きなうねり)
const NOISE_AMP = 18;            // ノイズの最大振幅(px) - 通常領域
const NOISE_AMP_STRONG = 36;     // 黒背景(白い線)領域での最大振幅
const DASH_MIN_LENGTH = 120;     // 灰色の点線: この長さ未満は直線で繋ぐ
const PARTICLE_LINK_DISTANCE = 60; // 灰色背景上のパーティクル同士、この距離以下なら線で繋ぐ

let dotShapes = [];
let dotRotations = [];
let dotShapeIndex = 0;
let titleFont;

function preload() {
    SOUND_ENTRIES.sort((a, b) => a.minutes - b.minutes);
    for (let entry of SOUND_ENTRIES) {
        sounds.push(loadSound(entry.file));
    }
    newSound641 = loadSound("sounds/新規録音 641.mp3");
    titleFont = loadFont("assets/KazukiReiwa/Fonts/KazukiReiwa - Regular.ttf");
}

let isSaving = false;
let isPlaying = false;
let playingIndex = -1;
let isClockRotating = false;

function setup() {
    createCanvas(windowWidth, windowHeight * 4);
    angleMode(RADIANS);

    for (let i = 0; i < 20000; i++) {
        dotShapes.push(floor(random(3)));
        dotRotations.push(random(TWO_PI));
    }

    layoutPoints(width, height);

    noLoop();
}

function layoutPoints(targetWidth, targetHeight) {
    points.length = 0;
    const entries = SOUND_ENTRIES.slice();
    const w = targetWidth;
    const h = targetHeight;

    entries.push({ time: "21時00分", file: null, minutes: 21 * 60, isExtra: true });
    sounds.push(newSound641);  // 新規録音 641.mp3を追加
    entries.push({ time: "21時30分", file: null, minutes: 21 * 60 + 30, isExtra: true });
    sounds.push(newSound641);  // 新規録音 641.mp3を追加
    entries.push({ time: "22時00分", file: null, minutes: 22 * 60, isExtra: true });
    sounds.push(newSound641);  // 新規録音 641.mp3を追加
    entries.push({ time: "23時00分", file: null, minutes: 23 * 60, isExtra: true });
    sounds.push(newSound641);  // 新規録音 641.mp3を追加
    entries.push({ time: "24時00分", file: null, minutes: 24 * 60, isExtra: true, isGray: true });
    entries.push({ time: "24時30分", file: null, minutes: 24 * 60 + 30, isExtra: true, isGray: true });
    const n = entries.length;
    const pad = CLOCK_RADIUS * 1.4;
    const titleSpace = 28 * 6 + 60;
    const marginY = pad + titleSpace;
    const isLandscape = w > h;
    const marginX = isLandscape
        ? w / 2 - CLOCK_RADIUS * 3
        : w / 2 - CLOCK_RADIUS * 1.5;

    // 黒/白の境目(blackTop = 21時.y - CLOCK_RADIUS*1.2)を縦中央に揃える
    // よって、21時の点の目標y = h/2 + CLOCK_RADIUS*1.2
    const firstExtraTargetY = h / 2 + CLOCK_RADIUS * 2.5;

    // 上半分(17:40〜20:41の10点)と下半分(21:00〜24:30の6点)で別々にスケール
    const firstExtraIdx = entries.findIndex(e => e.isExtra);
    const upperHalfH = firstExtraTargetY - marginY;
    const lowerHalfH = h - marginY - firstExtraTargetY;

    randomSeed(7);

    // 上半分: 17:40〜直前の20:41 を均等配置(末尾に黒境界からの余白を確保)
    const upperEntries = entries.slice(0, firstExtraIdx);
    const upperMinM = upperEntries[0].minutes;
    const upperMaxM = upperEntries[upperEntries.length - 1].minutes;
    const upperSpan = upperMaxM - upperMinM || 1;
    const upperBottomMargin = CLOCK_RADIUS * 2.5; // 20:41と黒境界の間に確保する余白
    const upperUsableH = upperHalfH - upperBottomMargin;
    let prevY = marginY;
    for (let i = 0; i < upperEntries.length; i++) {
        const e = upperEntries[i];
        const t = (e.minutes - upperMinM) / upperSpan;
        let y = marginY + t * upperUsableH;
        const jitter = random(-CLOCK_RADIUS * 0.4, CLOCK_RADIUS * 0.4);
        y += jitter;
        const minGap = CLOCK_RADIUS * 2.2;
        if (i > 0 && y - prevY < minGap) y = prevY + minGap;
        prevY = y;
        const x = i % 2 === 0 ? marginX : w - marginX;
        points.push({ x, y, minutes: e.minutes, isExtra: false, isGray: false });
    }

    // 下半分: 21:00〜24:30
    const lowerEntries = entries.slice(firstExtraIdx);
    const lowerMinM = lowerEntries[0].minutes;
    const lowerMaxM = lowerEntries[lowerEntries.length - 1].minutes;
    const lowerSpan = lowerMaxM - lowerMinM || 1;
    for (let i = 0; i < lowerEntries.length; i++) {
        const e = lowerEntries[i];
        const t = (e.minutes - lowerMinM) / lowerSpan;
        let y = firstExtraTargetY + t * lowerHalfH * 0.95;
        const jitter = i === 0 ? 0 : random(-CLOCK_RADIUS * 0.4, CLOCK_RADIUS * 0.4);
        y += jitter;
        const minGap = CLOCK_RADIUS * 1.0;
        if (i > 0 && y - prevY < minGap) y = prevY + minGap;
        prevY = y;
        const globalIdx = firstExtraIdx + i;
        const x = globalIdx % 2 === 0 ? marginX : w - marginX;
        points.push({ x, y, minutes: e.minutes, isExtra: true, isGray: !!e.isGray });
    }
}

function draw() {
    if (isSaving) return;
    drawScene(this);
}

function drawScene(pg) {
    const w = pg.width;
    const h = pg.height;

    pg.background(255);
    dotShapeIndex = 0;

    const firstExtra = points.find(p => p.isExtra);
    const firstGray = points.find(p => p.isGray);
    const blackTop = firstExtra ? firstExtra.y - CLOCK_RADIUS * 2.5 : h;
    const grayTop = firstGray ? firstGray.y - CLOCK_RADIUS * 2.5 : h;
    // 時計のドットや線が境界をまたぐ場合の色判定で参照する
    pg._blackTop = blackTop;
    pg._grayTop = grayTop;
    pg.noStroke();
    pg.fill(0);
    pg.rect(0, blackTop, w, h - blackTop);
    pg.fill(128);
    pg.rect(0, grayTop, w, h - grayTop);

    const sagIndex = points.findIndex(p => p.isExtra) - 1;
    const start21 = points.findIndex(p => p.minutes === 21 * 60 && p.isExtra);
    const start24 = points.findIndex(p => p.minutes === 24 * 60 && p.isExtra);
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        pg.strokeWeight(1.2);
        pg.noFill();
        if (i === sagIndex) {
            drawSagCurve(pg, p1, p2, blackTop);
        } else if (i >= start21 && i < start24) {
            // 21時から24時までの線はベジェ曲線で描画(境目をまたぐ23→24も同じ関数で処理)
            drawBezierCurve(pg, p1, p2, blackTop, grayTop);
        } else if (i >= start24) {
            // 24時以陋は点線で描画（灰色）
            drawDashedLine(pg, p1, p2);
        } else {
            const c1 = inkColorForY(p1.y, blackTop, grayTop, h);
            const c2 = inkColorForY(p2.y, blackTop, grayTop, h);
            const inkColor = c1 === c2 ? c1 : c2;
            pg.stroke(inkColor);
            drawNoisyLine(pg, p1.x, p1.y, p2.x, p2.y, blackTop, grayTop);
        }
    }

    const last = points[points.length - 1];
    if (last) {
        drawSagTail(pg, last);
    }

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // 24時以降は灰色固定、それ以外はドットの位置で色を決定(境界をまたぐ時計が反転)
        const inkColor = p.isGray ? POST_MIDNIGHT_INK : null;
        isClockRotating = isPlaying && i === playingIndex;
        drawClockAt(pg, p.x, p.y, p.minutes, inkColor);
    }
    isClockRotating = false;

    drawBoundaryGradient(pg, blackTop, grayTop);

    drawHourMarkers(pg);
    drawTitleVertical(pg);
    drawCodingPractice(pg);
    drawKaisenDon(pg);
    drawNothingComesUp(pg);
    drawListenRadio(pg);
    drawValorantNote(pg);
    drawShowerNote(pg);
    drawSakanaImage(pg);
    drawPinkNoRome(pg);

    // 灰色の部分の開始地点にパーティクルのたまりを描画
    if (firstGray) {
        drawSedimentParticles(pg, pg.width / 2, grayTop + CLOCK_RADIUS * 2, CLOCK_RADIUS * 10);
    }
}

function inkColorForY(y, blackTop, grayTop, h) {
    if (y >= grayTop) return POST_MIDNIGHT_INK; // 灰色背景上は灰色のインク
    if (y >= blackTop) return 255;              // 黒背景上は白
    return 0;                                   // 白背景上は黒
}

function drawBoundaryLine(p1, p2, blackTop) {
    // 境界（blackTop）との交点を見つけて、上下で色を分けて描画
    const dy = p2.y - p1.y;
    const dx = p2.x - p1.x;
    
    if (Math.abs(dy) < 0.01) {
        // ほぼ水平な線
        stroke(0);
        line(p1.x, p1.y, p2.x, p2.y);
        return;
    }
    
    const t = (blackTop - p1.y) / dy;
    
    if (t > 0 && t < 1) {
        const xBoundary = p1.x + dx * t;
        const yBoundary = blackTop;
        
        // 上部：黒で描画（白背景）
        stroke(0);
        line(p1.x, p1.y, xBoundary, yBoundary);
        
        // 下部：白で描画（灰色背景）
        stroke(255);
        line(xBoundary, yBoundary, p2.x, p2.y);
    } else {
        // 交差しない場合
        stroke(p2.y < blackTop ? 0 : 255);
        line(p1.x, p1.y, p2.x, p2.y);
    }
}

// 直線(p1->p2)にパーリンノイズの揺らぎを乗せた線を描画
// blackTop/grayTopが渡されると、黒背景領域(blackTop<=y<grayTop)では強振幅+3本線
function drawNoisyLine(pg, x1, y1, x2, y2, blackTop, grayTop) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
        pg.line(x1, y1, x2, y2);
        return;
    }
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;
    // 線の中点が黒背景なら強化
    const midY = (y1 + y2) / 2;
    const onBlackBg = blackTop !== undefined && grayTop !== undefined
        && midY >= blackTop && midY < grayTop;
    const baseAmp = onBlackBg ? NOISE_AMP_STRONG : NOISE_AMP;
    const amp = Math.min(baseAmp, len * (onBlackBg ? 0.16 : 0.08));
    const STEPS = Math.max(12, Math.floor(len / 12));

    const useDynamicColor = blackTop !== undefined && grayTop !== undefined;
    let prevX = x1;
    let prevY = y1;
    for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const baseX = x1 + dx * t;
        const baseY = y1 + dy * t;
        const taper = Math.sin(t * Math.PI);
        const n = (noise(baseX * NOISE_SCALE, baseY * NOISE_SCALE) - 0.5) * 2;
        const off = n * amp * taper;
        const x = baseX + nx * off;
        const y = baseY + ny * off;
        if (useDynamicColor) {
            pg.stroke(inkColorForY(y, blackTop, grayTop, pg.height));
        }
        pg.line(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
    }
}

function drawDashedLine(pg, p1, p2) {
    // 24時以陋の点線（灰色） - パーリンノイズで揺らぎ付き
    pg.push();
    pg.stroke(POST_MIDNIGHT_INK);
    pg.strokeWeight(1.4);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
        pg.pop();
        return;
    }
    // 短い線はそのまま直線で繋ぐ(灰色背景上で見えやすいよう白で描画)
    if (len < DASH_MIN_LENGTH) {
        pg.stroke(255);
        pg.line(p1.x, p1.y, p2.x, p2.y);
        pg.pop();
        return;
    }
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const amp = Math.min(NOISE_AMP, len * 0.08);

    // ダッシュ8px + ギャップ6px のパターンを、揺らぎ付きでサンプリング
    const dash = 8;
    const gap = 6;
    const period = dash + gap;
    let dist = 0;
    while (dist < len) {
        const dEnd = Math.min(dist + dash, len);
        // ダッシュ区間を細かく分割して曲げる
        const segs = Math.max(2, Math.ceil((dEnd - dist) / 3));
        let prevX = null, prevY = null;
        for (let s = 0; s <= segs; s++) {
            const t = (dist + (dEnd - dist) * (s / segs)) / len;
            const baseX = p1.x + dx * t;
            const baseY = p1.y + dy * t;
            const taper = Math.sin(t * Math.PI);
            const n = (noise(baseX * NOISE_SCALE, baseY * NOISE_SCALE) - 0.5) * 2;
            const off = n * amp * taper;
            const x = baseX + nx * off;
            const y = baseY + ny * off;
            if (prevX !== null) pg.line(prevX, prevY, x, y);
            prevX = x;
            prevY = y;
        }
        dist += period;
    }
    pg.pop();
}

function drawBezierCurve(pg, p1, p2, blackTop, grayTop) {
    // 二次ベジェ伵曲線を使用
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const controlX = (p1.x + p2.x) / 2;
    const controlY = (p1.y + p2.y) / 2 - Math.abs(dx) * 0.4;

    const chord = dist(p1.x, p1.y, p2.x, p2.y);
    // 中点が黒背景なら強振幅+3本線
    const midY = (p1.y + p2.y) / 2;
    const onBlackBg = midY >= blackTop && midY < grayTop;
    const baseAmp = onBlackBg ? NOISE_AMP_STRONG : NOISE_AMP;
    const amp = Math.min(baseAmp, chord * (onBlackBg ? 0.16 : 0.08));

    const STEPS = 40;
    let prevX = p1.x;
    let prevY = p1.y;

    for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const oneT = 1 - t;
        let x = oneT * oneT * p1.x + 2 * oneT * t * controlX + t * t * p2.x;
        let y = oneT * oneT * p1.y + 2 * oneT * t * controlY + t * t * p2.y;
        const tanX = 2 * oneT * (controlX - p1.x) + 2 * t * (p2.x - controlX);
        const tanY = 2 * oneT * (controlY - p1.y) + 2 * t * (p2.y - controlY);
        const tLen = Math.sqrt(tanX * tanX + tanY * tanY) || 1;
        const nx = -tanY / tLen;
        const ny = tanX / tLen;
        const taper = Math.sin(t * Math.PI);
        const n = (noise(x * NOISE_SCALE, y * NOISE_SCALE) - 0.5) * 2;
        const off = n * amp * taper;
        x += nx * off;
        y += ny * off;
        const inkColor = inkColorForY(y, blackTop, grayTop, pg.height);
        pg.stroke(inkColor);
        pg.line(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
    }
}

function drawBoundaryGradient(pg, blackTop, grayTop) {
    pg.push();
    pg.randomSeed(42);
    drawGradientBand(pg, blackTop, blackTop, grayTop, 120, 350);
    if (grayTop < pg.height) {
        drawGradientBand(pg, grayTop, blackTop, grayTop, 120, 350);
    }
    pg.pop();
}

function drawGradientBand(pg, centerY, blackTop, grayTop, bandHalf, numParticles) {
    pg.noFill();
    pg.strokeWeight(1);
    for (let i = 0; i < numParticles; i++) {
        const dy = random(-bandHalf, bandHalf);
        const norm = Math.abs(dy) / bandHalf;
        if (random() < norm) continue;
        const x = random(0, pg.width);
        const y = centerY + dy;
        let inkColor = inkColorForY(y, blackTop, grayTop);
        if (y >= grayTop) {
            inkColor = 0;
        } else if (y >= blackTop) {
            inkColor = POST_MIDNIGHT_INK;
        }
        const shape = floor(random(3));
        const rot = random(TWO_PI);
        const size = random(4, 9);
        const half = size / 2;
        pg.stroke(inkColor);

        if (shape === 1) {
            pg.circle(x, y, size);
            continue;
        }
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        if (shape === 0) {
            const x1 = x + (-half) * c - (-half) * s;
            const y1 = y + (-half) * s + (-half) * c;
            const x2 = x + (half) * c - (-half) * s;
            const y2 = y + (half) * s + (-half) * c;
            const x3 = x + (half) * c - (half) * s;
            const y3 = y + (half) * s + (half) * c;
            const x4 = x + (-half) * c - (half) * s;
            const y4 = y + (-half) * s + (half) * c;
            pg.quad(x1, y1, x2, y2, x3, y3, x4, y4);
        } else {
            const h = size * 0.866;
            const ax = 0, ay = -h / 2;
            const bx = -half, by = h / 2;
            const cx2 = half, cy2 = h / 2;
            pg.triangle(
                x + ax * c - ay * s, y + ax * s + ay * c,
                x + bx * c - by * s, y + bx * s + by * c,
                x + cx2 * c - cy2 * s, y + cx2 * s + cy2 * c,
            );
        }
    }
}

function drawSakanaImage(pg) {
    // 22時のポイントを見つける (1320分)
    const targetPoint = points.find(p => p.minutes === 22 * 60 && p.isExtra);
    if (!targetPoint) return;
    pg.push();
    pg.fill(255);
    pg.noStroke();
    pg.textFont("sans-serif");
    pg.textAlign(CENTER, TOP);

    const leftEdge = Math.min(...points.map(p => p.x)) - CLOCK_RADIUS * 1.4;
    const x = leftEdge / 2;
    const startY = targetPoint.y - CLOCK_RADIUS * 0.7; // 22時のポイントを基準に配置
    drawVerticalText(pg, x, startY, "ナイロンの糸", "＊sakanaction");
    pg.pop();
}

function drawPinkNoRome(pg) {
    // 22時と23時の中間に配置(右余白に縦書き)
    const p22 = points.find(p => p.minutes === 22 * 60 && p.isExtra);
    const p23 = points.find(p => p.minutes === 23 * 60 && p.isExtra);
    if (!p22 || !p23) return;
    pg.push();
    pg.fill(255);
    pg.noStroke();
    pg.textFont("sans-serif");
    pg.textAlign(CENTER, TOP);

    const rightEdge = Math.max(...points.map(p => p.x)) + CLOCK_RADIUS * 1.4;
    const x = (rightEdge + pg.width) / 2;
    const midY = (p22.y + p23.y) / 2;
    const startY = midY - CLOCK_RADIUS * 0.7;
    drawVerticalText(pg, x, startY, "Pink", "＊No Rome");
    pg.pop();
}

function drawCodingPractice(pg) {
    drawNoteWithTagsAt(
        pg,
        19 * 60 + 40,
        ["AIの怠惰な部分が好きだけど嫌い"],
        ["＃CreativeCoding"],
        "left",
        16
    );
}

function drawKaisenDon(pg) {
    drawNoteWithTagsAt(
        pg,
        18 * 60 + 40,
        ["一食1000円を超えないように、そしてできるだけ健康に"],
        ["＃883円", "＃満腹中枢"],
        "right",
        540,
        "left"
    );
}

function drawNothingComesUp(pg) {
    drawNoteWithTagsAt(
        pg,
        20 * 60 + 20, // 20時30分に配置
        ["何も浮かばない、、、まずい"],
        ["＃課題終わらんて", "＃レポートの書き方募", "＃美大のレポート"],
        "right", // 時計の左側（タイムラインの左側）に配置
        500,    // オフセットを大幅に増やしてさらに左へ
        "left"  // テキストは左揃え
    );
}

function drawValorantNote(pg) {
    const targetMin = 21 * 60 + 30;
    const bodyLines = ["先輩に誘われvalo。", "少しだけね"];
    const tags = ["＃valorant", "＃RiotGames"];
    const side = "right";
    const offset = 280;
    const align = "left";
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (targetMin >= p1.minutes && targetMin <= p2.minutes) {
            const t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            pg.push();
            pg.noStroke();
            pg.textFont("sans-serif");

            const bodySize = 18;
            const tagSize = 16;
            const lineGap = 6;
            const tagsTopGap = 18;
            const tagJoin = "  ";

            const isRight = side === "right";
            const baseX = isRight ? x - offset : x + offset;
            pg.textAlign(align === "right" ? RIGHT : LEFT, TOP);

            pg.textSize(bodySize);
            const bodyH = bodyLines.length * bodySize + (bodyLines.length - 1) * lineGap;
            const tagH = tagSize;
            const totalH = bodyH + tagsTopGap + tagH;
            let cursorY = y - totalH / 2;

            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            for (const line of bodyLines) {
                pg.text(line, baseX, cursorY);
                cursorY += bodySize + lineGap;
            }
            cursorY += tagsTopGap - lineGap;
            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            pg.textSize(tagSize);
            pg.text(tags.join(tagJoin), baseX, cursorY);

            pg.pop();
            return;
        }
    }
}

function drawShowerNote(pg) {
    const targetMin = 22 * 60;
    const bodyLines = ["10分でシャワーを浴びる。"];
    const tags = ["＃シャワー"];
    const side = "right";
    const offset = -250;
    const align = "left";
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (targetMin >= p1.minutes && targetMin <= p2.minutes) {
            const t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            pg.push();
            pg.noStroke();
            pg.textFont("sans-serif");

            const bodySize = 18;
            const tagSize = 16;
            const lineGap = 6;
            const tagsTopGap = 18;
            const tagJoin = "  ";

            const isRight = side === "right";
            const baseX = isRight ? x - offset : x + offset;
            pg.textAlign(align === "right" ? RIGHT : LEFT, TOP);

            pg.textSize(bodySize);
            const bodyH = bodyLines.length * bodySize + (bodyLines.length - 1) * lineGap;
            const tagH = tagSize;
            const totalH = bodyH + tagsTopGap + tagH;
            let cursorY = y - totalH / 2;

            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            for (const line of bodyLines) {
                pg.text(line, baseX, cursorY);
                cursorY += bodySize + lineGap;
            }
            cursorY += tagsTopGap - lineGap;
            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            pg.textSize(tagSize);
            pg.text(tags.join(tagJoin), baseX, cursorY);

            pg.pop();
            return;
        }
    }
}



function drawListenRadio(pg) {
    const targetMin = 24 * 60 + 15;
    const bodyLines = ["くーむしちゅーのオールナイトニッポンを聴く"];
    const tags = ["＃ANN", "＃らじお"];
    const side = "left";
    const offset = -480;
    const align = "left";
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (targetMin >= p1.minutes && targetMin <= p2.minutes) {
            const t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            pg.push();
            pg.noStroke();
            pg.textFont("sans-serif");

            const bodySize = 18;
            const tagSize = 16;
            const lineGap = 6;
            const tagsTopGap = 18;
            const tagJoin = "  ";

            const isRight = side === "right";
            const baseX = isRight ? x - offset : x + offset;
            pg.textAlign(align === "right" ? RIGHT : LEFT, TOP);

            pg.textSize(bodySize);
            const bodyH = bodyLines.length * bodySize + (bodyLines.length - 1) * lineGap;
            const tagH = tagSize;
            const totalH = bodyH + tagsTopGap + tagH;
            let cursorY = y - totalH / 2;

            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            for (const line of bodyLines) {
                pg.text(line, baseX, cursorY);
                cursorY += bodySize + lineGap;
            }
            cursorY += tagsTopGap - lineGap;
            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            pg.textSize(tagSize);
            pg.text(tags.join(tagJoin), baseX, cursorY);

            pg.pop();
            return;
        }
    }
}

// 時刻の位置に「本文(複数行) + ハッシュタグ(横並び)」を表示
// side: "left" = 時計の右側に配置 / "right" = 時計の左側に配置
// align: "left" or "right" (テキスト自体の揃え)。省略時は side と同じ。
function drawNoteWithTagsAt(pg, targetMin, bodyLines, tags, side = "left", offset = 16, align) {
    if (!titleFont) return;
    if (!align) align = side;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (targetMin >= p1.minutes && targetMin <= p2.minutes) {
            const t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            pg.push();
            pg.noStroke();
            pg.textFont(titleFont);

            const bodySize = 18;
            const tagSize = 16;
            const lineGap = 6;
            const tagsTopGap = 18;
            const tagJoin = "  ";

            const isRight = side === "right";
            const baseX = isRight ? x - offset : x + offset;
            pg.textAlign(align === "right" ? RIGHT : LEFT, TOP);

            pg.textSize(bodySize);
            const bodyH = bodyLines.length * bodySize + (bodyLines.length - 1) * lineGap;
            const tagH = tagSize;
            const totalH = bodyH + tagsTopGap + tagH;
            let cursorY = y - totalH / 2;

            // テキストのY座標に基づいて色を設定
            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            for (const line of bodyLines) {
                pg.text(line, baseX, cursorY);
                cursorY += bodySize + lineGap;
            }
            cursorY += tagsTopGap - lineGap;
            // タグのY座標に基づいて色を設定
            pg.fill(inkColorForY(cursorY, pg._blackTop, pg._grayTop, pg.height));
            pg.textSize(tagSize);
            pg.text(tags.join(tagJoin), baseX, cursorY);

            pg.pop();
            return;
        }
    }
}

function drawHashtagAt(pg, targetMin, label, side = "left", offset = 16) {
    if (!titleFont) return;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (targetMin >= p1.minutes && targetMin <= p2.minutes) {
            const t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            pg.push();
            pg.fill(0);
            pg.noStroke();
            pg.textFont(titleFont);
            pg.textSize(18);
            if (side === "right") {
                pg.textAlign(RIGHT, CENTER);
                pg.text(label, x - offset, y);
            } else {
                pg.textAlign(LEFT, CENTER);
                pg.text(label, x + offset, y);
            }
            pg.pop();
            return;
        }
    }
}

function drawSagCurve(pg, p1, p2, blackTop) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const sagAmount = Math.abs(dx) * 0.28 + 50;

    // 鎖が垂れるような左右非対称の三次ベジェ
    // 制御点を1/3・2/3地点に置き、各端点近くで接線が下向きになるよう配置
    const c1x = p1.x + dx * 0.28;
    const c1y = p1.y + sagAmount * 1.0;
    const c2x = p1.x + dx * 0.72;
    const c2y = p2.y + sagAmount * 0.55;

    pg.noFill();
    pg.strokeWeight(1.2);
    const STEPS = 100;
    let prevX = p1.x;
    let prevY = p1.y;

    for (let s = 1; s <= STEPS; s++) {
        const u = s / STEPS;
        const oneU = 1 - u;
        const baseX = oneU * oneU * oneU * p1.x
            + 3 * oneU * oneU * u * c1x
            + 3 * oneU * u * u * c2x
            + u * u * u * p2.x;
        const baseY = oneU * oneU * oneU * p1.y
            + 3 * oneU * oneU * u * c1y
            + 3 * oneU * u * u * c2y
            + u * u * u * p2.y;

        // 法線方向(ノイズ方向)
        const tanX = 3 * oneU * oneU * (c1x - p1.x)
            + 6 * oneU * u * (c2x - c1x)
            + 3 * u * u * (p2.x - c2x);
        const tanY = 3 * oneU * oneU * (c1y - p1.y)
            + 6 * oneU * u * (c2y - c1y)
            + 3 * u * u * (p2.y - c2y);
        const tLen = Math.sqrt(tanX * tanX + tanY * tanY) || 1;
        const nx = -tanY / tLen;
        const ny = tanX / tLen;

        // 黒背景上のみパーリンノイズを乗せる(境界をまたぐ際に滑らかにフェードイン)
        let x = baseX;
        let y = baseY;
        const fadeBand = 40;
        const blackness = constrain((baseY - blackTop) / fadeBand, 0, 1);
        if (blackness > 0) {
            const taper = Math.sin(u * Math.PI);
            const n = (noise(baseX * NOISE_SCALE, baseY * NOISE_SCALE) - 0.5) * 2;
            const off = n * NOISE_AMP_STRONG * taper * blackness;
            x += nx * off;
            y += ny * off;
        }

        pg.stroke(y >= blackTop ? 255 : 0);
        pg.line(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
    }
}

function drawSagTail(pg, p) {
    // 線の終点を画面下端ギリギリにし、堆積は下端に接地させる
    const startY = p.y + CLOCK_RADIUS * 1.05;
    const moundBaseY = pg.height; // 堆積の底=画面下端
    const moundHeight = CLOCK_RADIUS * 0.7;
    const endY = moundBaseY - moundHeight; // ぺたんとした山の頂上に線が刺さる
    const tailLength = endY - startY;
    if (tailLength <= 0) return;
    const swayX = CLOCK_RADIUS * 0.8;
    const cx1 = p.x + (p.x < pg.width / 2 ? swayX : -swayX);
    const cx2 = p.x + (p.x < pg.width / 2 ? -swayX * 0.5 : swayX * 0.5);
    pg.push();
    pg.noFill();
    pg.stroke(POST_MIDNIGHT_INK);
    pg.strokeWeight(1.4);
    pg.drawingContext.setLineDash([8, 6]);
    pg.bezier(
        p.x,
        startY,
        cx1,
        startY + tailLength * 0.4,
        cx2,
        startY + tailLength * 0.7,
        p.x,
        endY
    );
    pg.drawingContext.setLineDash([]);
    pg.pop();

    // 線の先に山なりに積もるパーティクル(画面下端に接地)
    drawMoundParticles(pg, p.x, moundBaseY, CLOCK_RADIUS * 2.4);
}

// 線の先に山なりに堆積するパーティクル(中央が高く、左右になだらかに広がる)
function drawMoundParticles(pg, centerX, baseY, radius) {
    pg.push();
    pg.randomSeed(456);
    pg.noFill();
    pg.strokeWeight(0.8);
    pg.stroke(255); // 灰色背景上を想定して白

    const moundWidth = radius * 2.6;
    const moundHeight = radius * 0.7;
    const particleCount = 140;

    for (let i = 0; i < particleCount; i++) {
        // x は中央寄りに、放物線状の山の高さ内にyを乗せる
        const u = random(-1, 1); // -1..1
        // 中央寄り分布: 累乗を強めて中央に密集
        const xNorm = Math.sign(u) * Math.pow(Math.abs(u), 1.4);
        const x = centerX + xNorm * moundWidth / 2;

        // 山の高さ: 中央で最大 (1 - xNorm^2)
        const localTop = baseY - moundHeight * (1 - xNorm * xNorm);

        // 山の内側でランダムにyを取る (上端より下、地面より上)
        const yT = random();
        const y = lerp(baseY, localTop, yT);

        // 上ほど小粒、下ほど大粒
        const sizeT = 1 - yT;
        const baseSize = lerp(1.2, 7.5, sizeT);
        const size = baseSize + random(-0.4, 0.4);
        const shape = floor(random(3));
        const rot = random(TWO_PI);
        const half = size / 2;

        if (shape === 1) {
            pg.circle(x, y, size);
            continue;
        }
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        if (shape === 0) {
            const x1 = x + (-half) * c - (-half) * s;
            const y1 = y + (-half) * s + (-half) * c;
            const x2 = x + (half) * c - (-half) * s;
            const y2 = y + (half) * s + (-half) * c;
            const x3 = x + (half) * c - (half) * s;
            const y3 = y + (half) * s + (half) * c;
            const x4 = x + (-half) * c - (half) * s;
            const y4 = y + (-half) * s + (half) * c;
            pg.quad(x1, y1, x2, y2, x3, y3, x4, y4);
        } else {
            const h = size * 0.866;
            const ax = 0, ay = -h / 2;
            const bx = -half, by = h / 2;
            const cx2 = half, cy2 = h / 2;
            pg.triangle(
                x + ax * c - ay * s, y + ax * s + ay * c,
                x + bx * c - by * s, y + bx * s + by * c,
                x + cx2 * c - cy2 * s, y + cx2 * s + cy2 * c,
            );
        }
    }
    pg.pop();
}

function drawSedimentParticles(pg, centerX, centerY, radius) {
    // 沈殿しているパーティクル表現（下に大きく、上に小さく）
    pg.push();
    pg.randomSeed(123);
    const particleCount = 70;
    const maxY = pg.height - 20;
    const minY = max(centerY - radius * 0.45, 0);

    // 灰色背景の境界(grayTop)を計算
    const firstGray = points.find(p => p.isGray);
    const grayTop = firstGray ? firstGray.y - CLOCK_RADIUS * 2.5 : pg.height;

    pg.noFill();
    pg.strokeWeight(0.8);

    const grayParticles = [];

    for (let i = 0; i < particleCount; i++) {
        const layerT = pow(random(), 0.55);
        const y = lerp(minY, maxY, layerT);
        const spread = lerp(radius * 0.28, radius * 1.15, layerT);
        const x = centerX + random(-spread, spread);
        const baseSize = lerp(1.2, 8.2, layerT);
        const size = baseSize + random(-0.35, 0.35);
        const shape = floor(random(3));
        const rot = random(TWO_PI);
        const half = size / 2;

        // 灰色背景上では白、それ以外(白背景)では黒
        const onGray = y >= grayTop;
        pg.stroke(onGray ? 255 : 0);

        if (onGray) grayParticles.push({ x, y });

        if (shape === 1) {
            pg.circle(x, y, size);
            continue;
        }
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        if (shape === 0) {
            const x1 = x + (-half) * c - (-half) * s;
            const y1 = y + (-half) * s + (-half) * c;
            const x2 = x + (half) * c - (-half) * s;
            const y2 = y + (half) * s + (-half) * c;
            const x3 = x + (half) * c - (half) * s;
            const y3 = y + (half) * s + (half) * c;
            const x4 = x + (-half) * c - (half) * s;
            const y4 = y + (-half) * s + (half) * c;
            pg.quad(x1, y1, x2, y2, x3, y3, x4, y4);
        } else {
            const h = size * 0.866;
            const ax = 0, ay = -h / 2;
            const bx = -half, by = h / 2;
            const cx2 = half, cy2 = h / 2;
            pg.triangle(
                x + ax * c - ay * s, y + ax * s + ay * c,
                x + bx * c - by * s, y + bx * s + by * c,
                x + cx2 * c - cy2 * s, y + cx2 * s + cy2 * c,
            );
        }
    }

    // 灰色背景上のパーティクル同士、近いペアを白線で繋ぐ
    pg.stroke(255);
    pg.strokeWeight(0.6);
    const linkDist = PARTICLE_LINK_DISTANCE;
    const linkDistSq = linkDist * linkDist;
    for (let i = 0; i < grayParticles.length; i++) {
        const a = grayParticles[i];
        for (let j = i + 1; j < grayParticles.length; j++) {
            const b = grayParticles[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < linkDistSq) {
                pg.line(a.x, a.y, b.x, b.y);
            }
        }
    }
    pg.pop();
}

function drawHourMarkers(pg) {
    if (!titleFont || points.length < 2) return;
    const firstExtra = points.find(p => p.isExtra);
    const firstGray = points.find(p => p.isGray);
    const blackTop = firstExtra ? firstExtra.y - CLOCK_RADIUS * 2.5 : pg.height;
    const grayTop = firstGray ? firstGray.y - CLOCK_RADIUS * 2.5 : pg.height;
    pg.push();
    pg.noStroke();
    pg.textSize(18);
    pg.textAlign(LEFT, CENTER);

    const minDistFromClock = CLOCK_RADIUS * 1.3;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const h1 = Math.floor(p1.minutes / 60);
        const h2 = Math.floor(p2.minutes / 60);
        for (let h = h1 + 1; h <= h2; h++) {
            const targetMin = h * 60;
            if (targetMin < p1.minutes || targetMin > p2.minutes) continue;
            let t = (targetMin - p1.minutes) / (p2.minutes - p1.minutes);
            const p1Hour = Math.floor(p1.minutes / 60);
            const p2Hour = Math.floor(p2.minutes / 60);
            // 同じ"時"のクロックがあるなら、その外側(線とは反対側)にラベルを置く
            const sameHourClock = p2Hour === h ? p2 : (p1Hour === h ? p1 : null);
            if (sameHourClock) {
                const otherClock = sameHourClock === p2 ? p1 : p2;
                const onLeftOfOther = sameHourClock.x < otherClock.x;
                const offset = CLOCK_RADIUS * 1.5;
                const labelY = sameHourClock.y - CLOCK_RADIUS * 1.1;
                const inkColor = inkColorForY(labelY, blackTop, grayTop, pg.height);
                const isPostMidnightLabel = targetMin >= 24 * 60;
                const labelColor = isPostMidnightLabel || labelY >= grayTop ? POST_MIDNIGHT_INK : inkColor;
                if (isPostMidnightLabel || (labelY >= blackTop && labelY < grayTop)) {
                    pg.textFont("sans-serif");
                } else {
                    pg.textFont(titleFont);
                }
                pg.fill(labelColor);
                if (onLeftOfOther) {
                    // 同じ時のクロックが左側 → さらに左にラベル(右揃え)
                    pg.textAlign(RIGHT, CENTER);
                    pg.text(`${h}:00`, sameHourClock.x - offset, labelY);
                } else {
                    pg.textAlign(LEFT, CENTER);
                    pg.text(`${h}:00`, sameHourClock.x + offset, labelY);
                }
                pg.textAlign(LEFT, CENTER);
                continue;
            }
            const segLen = dist(p1.x, p1.y, p2.x, p2.y);
            if (segLen > 0) {
                const minT = minDistFromClock / segLen;
                const maxT = 1 - minT;
                if (minT < maxT) {
                    t = constrain(t, minT, maxT);
                }
            }
            const x = lerp(p1.x, p2.x, t);
            const y = lerp(p1.y, p2.y, t);
            const inkColor = inkColorForY(y, blackTop, grayTop, pg.height);
            const isPostMidnightLabel = targetMin >= 24 * 60;
            const labelColor = isPostMidnightLabel || y >= grayTop ? POST_MIDNIGHT_INK : inkColor;
            if (isPostMidnightLabel || (y >= blackTop && y < grayTop)) {
                pg.textFont("sans-serif");
            } else {
                pg.textFont(titleFont);
            }
            pg.fill(labelColor);
            const nearClockP1 = dist(x, y, p1.x, p1.y) < CLOCK_RADIUS * 1.5;
            const nearClockP2 = dist(x, y, p2.x, p2.y) < CLOCK_RADIUS * 1.5;
            if (nearClockP1 || nearClockP2) {
                const closeP = nearClockP1 ? p1 : p2;
                const labelX = closeP.x - CLOCK_RADIUS * 1.3;
                pg.textAlign(RIGHT, CENTER);
                pg.text(`${h}:00`, labelX, closeP.y);
                pg.textAlign(LEFT, CENTER);
            } else {
                pg.text(`${h}:00`, x + 12, y);
            }
        }
    }
    pg.pop();
}

function drawTitleVertical(pg) {
    if (!titleFont || points.length < 2) return;
    pg.push();
    pg.fill(0);
    pg.noStroke();
    pg.textFont(titleFont);
    pg.textAlign(CENTER, TOP);

    const first = points[0];
    const firstLeftEdge = first.x - CLOCK_RADIUS * 1.4;
    const firstX = firstLeftEdge * 0.3;
    const firstY = first.y - CLOCK_RADIUS * 0.7;
    drawVerticalText(pg, firstX, firstY, "雨ニモマケズ", "＊宮沢賢治");

    const second = points[1];
    const secondRightEdge = second.x + CLOCK_RADIUS * 1.4;
    const secondX = (secondRightEdge + pg.width) / 2;
    const secondY = second.y - CLOCK_RADIUS * 0.7;
    drawVerticalText(pg, secondX, secondY, "いきることばつむぐいのち", "＊永井一正");

    if (points.length >= 6) {
        const target = points[5];
        const targetRightEdge = target.x + CLOCK_RADIUS * 1.4;
        const targetX = (targetRightEdge + pg.width) / 2;
        const targetY = target.y - CLOCK_RADIUS * 0.7;
        drawVerticalText(pg, targetX, targetY, "環境デザイン", "＊内藤廣");
    }

    const titleSize = 28;
    const rightX = pg.width - 80;
    pg.textAlign(RIGHT, TOP);
    pg.textSize(titleSize);
    pg.fill(0);
    pg.text("文化的な時間", rightX, 40);

    const firstExtra = points.find(p => p.isExtra);
    if (firstExtra) {
        const blackTop = firstExtra.y - CLOCK_RADIUS * 2.5;
        pg.fill(255);
        pg.textFont("sans-serif");
        pg.text("自堕落な時間", rightX, blackTop + 80);

        const extras = points.filter(p => p.isExtra);

        const sleepP = points.find(p => p.isGray && p.minutes === 24 * 60 + 30);
        if (sleepP) {
            const gap = CLOCK_RADIUS * 1.8;
            const tagX = sleepP.x < pg.width / 2 ? sleepP.x + gap : sleepP.x - gap;
            const tagAlign = sleepP.x < pg.width / 2 ? LEFT : RIGHT;
            pg.textAlign(tagAlign, CENTER);
            pg.textFont("sans-serif");
            pg.textSize(22);
            pg.fill(POST_MIDNIGHT_INK);
            pg.text("#就寝", tagX, sleepP.y);
        }
    }
    pg.pop();
}

function drawVerticalText(pg, x, startY, title, sub) {
    const titleSize = 28;
    const subSize = 18;
    const lineGap = 18;

    pg.textSize(titleSize);
    let y = startY;
    for (let i = 0; i < title.length; i++) {
        pg.text(title[i], x, y);
        y += titleSize + 2;
    }
    y += lineGap;
    pg.textSize(subSize);
    for (let i = 0; i < sub.length; i++) {
        pg.text(sub[i], x, y);
        y += subSize + 2;
    }
}

function drawClockAt(pg, cx, cy, totalMinutes, inkColor = 0) {
    const r = CLOCK_RADIUS;
    drawDodecagon(pg, cx, cy, r * 1.05, inkColor);

    const minu = totalMinutes % 60;
    const hr = (Math.floor(totalMinutes / 60) % 12) + minu / 60;
    const hourAngle = -PI / 2 + (hr / 12) * TWO_PI;
    const minAngle = -PI / 2 + (minu / 60) * TWO_PI;

    drawHandAsDots(pg, cx, cy, hourAngle, r * 0.5, r * 0.18, inkColor);
    drawHandAsDots(pg, cx, cy, minAngle, r * 0.78, r * 0.13, inkColor);
    drawCircleAsDots(pg, cx, cy, r * 0.12, inkColor);
}

function drawDodecagon(pg, cx, cy, r, inkColor = 0) {
    const verts = [];
    for (let i = 0; i < 12; i++) {
        const a = -PI / 2 + (i / 12) * TWO_PI;
        verts.push({ x: cx + cos(a) * r, y: cy + sin(a) * r });
    }
    for (let i = 0; i < 12; i++) {
        const v1 = verts[i];
        const v2 = verts[(i + 1) % 12];
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const tx = dx / len;
        const ty = dy / len;
        const count = Math.max(1, Math.round(len / DOT_SPACING));
        const step = len / count;
        for (let k = 0; k < count; k++) {
            drawShapeOutline(pg, v1.x + tx * step * k, v1.y + ty * step * k, inkColor);
        }
    }
}

function drawHandAsDots(pg, cx, cy, angle, length, thickness, inkColor = 0) {
    for (let l = 0; l <= length + DOT_SPACING; l += DOT_SPACING) {
        const x = cx + cos(angle) * l;
        const y = cy + sin(angle) * l;
        drawShapeOutline(pg, x, y, inkColor);
    }
}

function drawCircleAsDots(pg, cx, cy, r, inkColor = 0) {
    for (let y = -r; y <= r; y += DOT_SPACING) {
        for (let x = -r; x <= r; x += DOT_SPACING) {
            if (x * x + y * y <= r * r) {
                drawShapeOutline(pg, cx + x, cy + y, inkColor);
            }
        }
    }
}

function drawShapeOutline(pg, x, y, inkColor = 0) {
    const idx = dotShapeIndex % dotShapes.length;
    const shape = dotShapes[idx];
    let rot = dotRotations[idx];
    dotShapeIndex++;
    if (isClockRotating) {
        // 各ドットごとに少しずつ違う速度で回転(idxを使って決定的に分散)
        const speed = 0.04 + (idx % 7) * 0.008;
        const dir = (idx % 2 === 0) ? 1 : -1;
        rot += frameCount * speed * dir;
    }
    const half = DOT_SIZE / 2;
    // inkColor=null の場合はドット位置で色判定(境界をまたぐ時計の色反転)
    let actualColor = inkColor;
    if (actualColor === null && pg._blackTop !== undefined) {
        actualColor = inkColorForY(y, pg._blackTop, pg._grayTop, pg.height);
    }
    pg.noFill();
    pg.stroke(actualColor);
    pg.strokeWeight(1);
    if (shape === 1) {
        // 円は回転無関係
        pg.circle(x, y, DOT_SIZE);
        return;
    }
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    if (shape === 0) {
        // 4頂点を回転
        const x1 = x + (-half) * c - (-half) * s;
        const y1 = y + (-half) * s + (-half) * c;
        const x2 = x + (half) * c - (-half) * s;
        const y2 = y + (half) * s + (-half) * c;
        const x3 = x + (half) * c - (half) * s;
        const y3 = y + (half) * s + (half) * c;
        const x4 = x + (-half) * c - (half) * s;
        const y4 = y + (-half) * s + (half) * c;
        pg.quad(x1, y1, x2, y2, x3, y3, x4, y4);
    } else {
        const h = DOT_SIZE * 0.866;
        const ax = 0, ay = -h / 2;
        const bx = -half, by = h / 2;
        const cx2 = half, cy2 = h / 2;
        pg.triangle(
            x + ax * c - ay * s, y + ax * s + ay * c,
            x + bx * c - by * s, y + bx * s + by * c,
            x + cx2 * c - cy2 * s, y + cx2 * s + cy2 * c,
        );
    }
}

// Sキー(単独)で保存
window.addEventListener('keydown', (e) => {
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (typeof saveForPrint === 'function') saveForPrint();
    }
});

async function saveForPrint() {
    if (isSaving) return;
    isSaving = true;
    console.log("高解像度での保存を開始します... これには数分かかることがあります。");
    
    // 画面にメッセージを表示
    push();
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("高解像度ファイルを生成中...", width / 2, height / 2);
    pop();

    // 非同期で保存処理を実行
    await new Promise(resolve => setTimeout(resolve, 100));

    // A3を縦に2枚連結した比率 (297mm × 840mm) に合わせて論理サイズを決める
    // 画面の幅を基準に、高さをA3×2枚分の比率に正規化してから描画する
    // これにより各分割画像が正確にA3比率(297:420)になる
    const logicalW = width;
    const logicalH = logicalW * (A3_HEIGHT_MM * 2) / A3_WIDTH_MM;
    const scale = A3_WIDTH_PX / logicalW;
    const printWidth = A3_WIDTH_PX;
    const printHeight = A3_HEIGHT_PX * 2;

    // 印刷用に論理サイズでポイントを再レイアウト
    const savedPoints = points.map(p => ({ ...p }));
    layoutPoints(logicalW, logicalH);

    let pg = createGraphics(printWidth, printHeight);
    pg.angleMode(RADIANS);
    if (titleFont) pg.textFont(titleFont);

    // pg内部の論理サイズを画面と同じにするため、widthとheightをラップしたプロキシを作る
    // (drawScene内で pg.width / pg.height を参照する箇所のため)
    const realPg = pg;
    const proxyPg = new Proxy(pg, {
        get(target, prop) {
            if (prop === 'width') return logicalW;
            if (prop === 'height') return logicalH;
            const v = target[prop];
            return typeof v === 'function' ? v.bind(target) : v;
        },
    });

    pg.scale(scale);
    drawScene(proxyPg);

    console.log("描画完了。画像を分割して保存します。");

    // ページ分割: A3 1枚分(A3_HEIGHT_PX)ずつ正確に切り出す
    let topImg = realPg.get(0, 0, A3_WIDTH_PX, A3_HEIGHT_PX);
    topImg.save('artwork_part1', 'png');

    await new Promise(resolve => setTimeout(resolve, 100));

    let bottomImg = realPg.get(0, A3_HEIGHT_PX, A3_WIDTH_PX, A3_HEIGHT_PX);
    bottomImg.save('artwork_part2', 'png');

    pg.remove();

    // 画面用のレイアウトに戻す
    points.length = 0;
    for (const p of savedPoints) points.push(p);

    console.log("保存が完了しました。");

    isSaving = false;
    redraw();
}

function mousePressed() {
    if (isSaving) return;
    for (let i = 0; i < points.length; i++) { // No need to check for controls height as controls div is removed.
        if (points[i] && dist(mouseX, mouseY, points[i].x, points[i].y) <= HIT_RADIUS) { 
            playRandomClip(i);
            break;
        }
    }
}

function playRandomClip(index) {
    const snd = sounds[index];
    if (!snd || !snd.isLoaded()) return;

    if (currentSound && currentSound.isPlaying()) {
        currentSound.setVolume(0, 0.2);
        const prev = currentSound;
        setTimeout(() => prev.stop(), 250);
    }
    if (stopTimer) clearTimeout(stopTimer);
    if (fadeOutTimer) clearTimeout(fadeOutTimer);
    stopTimer = null;
    fadeOutTimer = null;

    const dur = snd.duration();
    let startSec;
    if (dur <= CLIP_DURATION) {
        startSec = 0;
    } else {
        const minStart = dur * 0.3;
        const maxStart = Math.min(dur * 0.7, dur - CLIP_DURATION);
        startSec = maxStart <= minStart ? Math.max(0, (dur - CLIP_DURATION) / 2) : random(minStart, maxStart);
    }

    snd.setVolume(0);
    snd.play(0, 1, 0, startSec, CLIP_DURATION);
    snd.setVolume(1, FADE_DURATION);
    currentSound = snd;

    isPlaying = true;
    playingIndex = index;
    frameRate(30);
    loop();

    fadeOutTimer = setTimeout(() => {
        snd.setVolume(0, FADE_DURATION);
    }, (CLIP_DURATION - FADE_DURATION) * 1000);

    stopTimer = setTimeout(() => {
        if (snd.isPlaying()) snd.stop();
        isPlaying = false;
        playingIndex = -1;
        noLoop();
        redraw();
    }, CLIP_DURATION * 1000);
}

function windowResized() {
    if (isSaving) return;
    resizeCanvas(windowWidth, windowHeight * 4);
    layoutPoints(width, height); // No need to update size info as controls div is removed.
    redraw();
}

function updateSizeInfo() {
}
