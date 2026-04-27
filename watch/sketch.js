const DOT_SIZE = 8;
const DOT_SPACING = 12;

let dotShapes = [];
let dotRotations = [];
let dotShapeIndex = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(RADIANS);
    for (let i = 0; i < 5000; i++) {
        dotShapes.push(floor(random(3)));
        dotRotations.push(random(TWO_PI));
    }
}

function draw() {
    background(255);
    dotShapeIndex = 0;

    const cx = width / 2;
    const cy = height / 2;
    const radius = min(width, height) * 0.4;

    drawDodecagon(cx, cy, radius * 1.05);

    const now = new Date();
    const ms = now.getMilliseconds();
    const sec = now.getSeconds() + ms / 1000;
    const minu = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + minu / 60;

    const hourAngle = -PI / 2 + (hr / 12) * TWO_PI;
    const minAngle = -PI / 2 + (minu / 60) * TWO_PI;
    const secAngle = -PI / 2 + (sec / 60) * TWO_PI;

    drawHandAsDots(cx, cy, hourAngle, radius * 0.5, 24);
    drawHandAsDots(cx, cy, minAngle, radius * 0.75, 18);
    drawHandAsDots(cx, cy, secAngle, radius * 0.85, 12);

    drawCircleAsDots(cx, cy, 18);
}

function drawDodecagon(cx, cy, r) {
    const verts = [];
    for (let i = 0; i < 12; i++) {
        const a = -PI / 2 + (i / 12) * TWO_PI;
        verts.push({ x: cx + cos(a) * r, y: cy + sin(a) * r });
    }
    const offsets = [-DOT_SPACING / 2, DOT_SPACING / 2];
    for (let i = 0; i < 12; i++) {
        const v1 = verts[i];
        const v2 = verts[(i + 1) % 12];
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        const count = Math.max(1, Math.round(len / DOT_SPACING));
        const step = len / count;
        for (let k = 0; k <= count; k++) {
            for (let off of offsets) {
                const px = v1.x + tx * step * k + nx * off;
                const py = v1.y + ty * step * k + ny * off;
                drawShapeOutline(px, py);
            }
        }
    }
}

function drawShapeOutline(x, y) {
    const idx = dotShapeIndex % dotShapes.length;
    const shape = dotShapes[idx];
    const rot = dotRotations[idx];
    dotShapeIndex++;
    const half = DOT_SIZE / 2;
    noFill();
    stroke(0);
    strokeWeight(1);
    push();
    translate(x, y);
    rotate(rot);
    if (shape === 0) {
        rect(-half, -half, DOT_SIZE, DOT_SIZE);
    } else if (shape === 1) {
        circle(0, 0, DOT_SIZE);
    } else {
        const h = DOT_SIZE * 0.866;
        triangle(
            0, -h / 2,
            -half, h / 2,
            half, h / 2,
        );
    }
    pop();
}

function drawHandAsDots(cx, cy, angle, length, thickness) {
    const halfT = thickness / 2;
    for (let l = 0; l <= length; l += DOT_SPACING) {
        for (let s = -halfT; s <= halfT; s += DOT_SPACING) {
            const x = cx + cos(angle) * l - sin(angle) * s;
            const y = cy + sin(angle) * l + cos(angle) * s;
            drawShapeOutline(x, y);
        }
    }
}

function drawCircleAsDots(cx, cy, r) {
    for (let y = -r; y <= r; y += DOT_SPACING) {
        for (let x = -r; x <= r; x += DOT_SPACING) {
            if (x * x + y * y <= r * r) {
                drawShapeOutline(cx + x, cy + y);
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
