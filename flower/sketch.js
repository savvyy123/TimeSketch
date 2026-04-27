const DOT_SIZE = 14;
const SAMPLE_DENSITY = 12; // 画像のピクセルを何ピクセルごとにサンプリングするか (小さいほど高解像度)
const BRIGHTNESS_THRESHOLD = 130; // この値より暗いピクセルを点として描画する (0-255)

let img;
let imagePoints = [];
let dotShapes = [];
let dotRotations = [];

function preload() {
    img = loadImage('assets/photo-1710839973977-ec4bf0723fbc.avif');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(RADIANS);
    extractPoints();
    prepareShapes();
    noLoop();
}

function extractPoints() {
    imagePoints = [];

    let imgAspectRatio = img.width / img.height;
    let canvasAspectRatio = width / height;

    let displayWidth, displayHeight;
    if (imgAspectRatio > canvasAspectRatio) {
        displayWidth = width;
        displayHeight = width / imgAspectRatio;
    } else {
        displayHeight = height;
        displayWidth = height * imgAspectRatio;
    }

    let sampleWidth = floor(displayWidth / SAMPLE_DENSITY);
    let sampleHeight = floor(displayHeight / SAMPLE_DENSITY);

    let pg = createGraphics(sampleWidth, sampleHeight);
    pg.image(img, 0, 0, sampleWidth, sampleHeight);
    pg.loadPixels();

    for (let y = 0; y < pg.height; y++) {
        for (let x = 0; x < pg.width; x++) {
            let index = (x + y * pg.width) * 4;
            let r = pg.pixels[index];
            let g = pg.pixels[index + 1];
            let b = pg.pixels[index + 2];
            let brightness = (r + g + b) / 3;

            if (brightness < BRIGHTNESS_THRESHOLD) {
                let mappedX = map(x, 0, pg.width, (width - displayWidth) / 2, (width + displayWidth) / 2);
                let mappedY = map(y, 0, pg.height, (height - displayHeight) / 2, (height + displayHeight) / 2);
                imagePoints.push({ x: mappedX, y: mappedY });
            }
        }
    }
    pg.remove();
}

function prepareShapes() {
    dotShapes = [];
    dotRotations = [];
    for (let i = 0; i < imagePoints.length; i++) {
        dotShapes.push(floor(random(3)));
        dotRotations.push(random(TWO_PI));
    }
}

function draw() {
    background(255);
    for (let i = 0; i < imagePoints.length; i++) {
        const p = imagePoints[i];
        drawShapeOutline(p.x, p.y, dotShapes[i], dotRotations[i]);
    }
}

function drawShapeOutline(x, y, shape, rot) {
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

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    extractPoints();
    prepareShapes();
    redraw();
}
