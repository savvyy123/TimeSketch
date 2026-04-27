const DOT_SIZE = 14;
const SAMPLE_DENSITY = 12; // 画像のピクセルを何ピクセルごとにサンプリングするか (小さいほど高解像度)
const BRIGHTNESS_THRESHOLD = 130; // この値より暗いピクセルを点として描画する (0-255)

let img;
let imagePoints = [];
let dotShapes = [];
let dotRotations = [];
let titleFont;
let boldFont;
let lightFont;

function preload() {
    img = loadImage('assets/photo-1710839973977-ec4bf0723fbc.avif');
    titleFont = loadFont('../1/assets/KazukiReiwa/Fonts/KazukiReiwa - Regular.ttf');
    boldFont = loadFont('../1/assets/KazukiReiwa/Fonts/KazukiReiwa - Bold.ttf');
    lightFont = loadFont('../1/assets/KazukiReiwa/Fonts/KazukiReiwa - Light.ttf');
}

function setup() {
    randomSeed(42);  // 固定シードで再現可能にする
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
    drawTextOverlay();
}

function drawTextOverlay() {
    // ===== メインタイトル（上部中央） =====
    const titleSize = 32;
    const topMargin = 30;
    fill(0);
    noStroke();
    textFont(boldFont);
    textSize(titleSize);
    textAlign(CENTER, TOP);
    text("時間の流れ", width / 2, topMargin);
    textSize(24);
    text("A/眠りにつくまでの夜の時間", width / 2, topMargin + titleSize + 8);

    // ===== 意図セクション（左側） =====
    const intentX = 60;
    const intentY = topMargin + titleSize + 120;
    textFont(boldFont);
    textSize(20);
    textAlign(LEFT, TOP);
    fill(0);
    text("意図", intentX, intentY);

    textFont(titleFont);
    textSize(16);
    textAlign(LEFT, TOP);
    fill(0);
    const intentText = 
        "ポスターの中に音があれば、その時間の保存のされ方に嘘がなくなるのでは？\n" +
        "と思い、デジタルで作ることを決めた。\n" +
        "格時計の真ん中をクリックすることで、音が流れる。\n" +
        "その時間に即興で弾いたピアノは文化的一日を表し\n" +
        "キーボードの音は怠惰の音である。";
    
    const lineHeight = 36;
    const lines = intentText.split("\n");
    let currentY = intentY + 40;
    for (let line of lines) {
        text(line, intentX, currentY);
        currentY += lineHeight;
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

function keyPressed() {
    // Sキー（大文字または小文字）で画像保存
    if (key === 's' || key === 'S') {
        saveAsA4(200); // DPI 200で保存
        return false; // デフォルト動作をキャンセル
    }
}

function saveAsA4(dpi) {
    // A4サイズ（210mm × 297mm）をDPIに応じてピクセル変換
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MM_TO_INCH = 1 / 25.4;
    
    const a4PixelWidth = Math.round(A4_WIDTH_MM * MM_TO_INCH * dpi);
    const a4PixelHeight = Math.round(A4_HEIGHT_MM * MM_TO_INCH * dpi);
    
    // A4サイズのグラフィックスバッファを作成
    let pg = createGraphics(a4PixelWidth, a4PixelHeight);
    
    // グラフィックスバッファに描画
    pg.background(255);
    
    // 画像アスペクト比を計算
    let imgAspectRatio = img.width / img.height;
    let canvasAspectRatio = a4PixelWidth / a4PixelHeight;
    
    let displayWidth, displayHeight;
    if (imgAspectRatio > canvasAspectRatio) {
        displayWidth = a4PixelWidth;
        displayHeight = a4PixelWidth / imgAspectRatio;
    } else {
        displayHeight = a4PixelHeight;
        displayWidth = a4PixelHeight * imgAspectRatio;
    }
    
    let scaleFactor = a4PixelWidth / width;
    let scaledDotSize = DOT_SIZE * scaleFactor;
    
    // ディスプレイに表示されているimagePointsとdotShapesをそのまま使用
    // A4キャンバスにマッピングして描画
    for (let i = 0; i < imagePoints.length; i++) {
        const p = imagePoints[i];
        
        // ディスプレイ座標からA4キャンバス座標に変換
        let imgAspectRatio = img.width / img.height;
        let canvasAspectRatio = a4PixelWidth / a4PixelHeight;
        
        let displayWidth, displayHeight;
        if (imgAspectRatio > canvasAspectRatio) {
            displayWidth = a4PixelWidth;
            displayHeight = a4PixelWidth / imgAspectRatio;
        } else {
            displayHeight = a4PixelHeight;
            displayWidth = a4PixelHeight * imgAspectRatio;
        }
        
        let offsetX = (a4PixelWidth - displayWidth) / 2;
        let offsetY = (a4PixelHeight - displayHeight) / 2;
        
        // ディスプレイ座標をA4座標に変換
        let a4X = map(p.x, (width - displayWidth/scaleFactor) / 2, (width + displayWidth/scaleFactor) / 2, offsetX, offsetX + displayWidth);
        let a4Y = map(p.y, (height - displayHeight/scaleFactor) / 2, (height + displayHeight/scaleFactor) / 2, offsetY, offsetY + displayHeight);
        
        // ディスプレイのdotShapesとdotRotationsを使用
        drawShapeOutlineOnGraphics(pg, a4X, a4Y, dotShapes[i], dotRotations[i], scaledDotSize);
    }
    
    // テキストを描画（高解像度版）
    drawTextOverlayOnGraphics(pg, a4PixelWidth, a4PixelHeight, scaleFactor);
    
    // 画像を保存
    pg.save('flower-A4-DPI200');
    pg.remove();
    
    console.log(`A4 DPI${dpi}で保存しました: ${a4PixelWidth} × ${a4PixelHeight} ピクセル`);
}

function drawShapeOutlineOnGraphics(pg, x, y, shape, rot, size) {
    const half = size / 2;
    pg.noFill();
    pg.stroke(0);
    pg.strokeWeight(size / 14); // DOT_SIZE比率に応じた線の太さ
    pg.push();
    pg.translate(x, y);
    pg.rotate(rot);
    if (shape === 0) {
        pg.rect(-half, -half, size, size);
    } else if (shape === 1) {
        pg.circle(0, 0, size);
    } else {
        const h = size * 0.866;
        pg.triangle(
            0, -h / 2,
            -half, h / 2,
            half, h / 2,
        );
    }
    pg.pop();
}

function drawTextOverlayOnGraphics(pg, pgWidth, pgHeight, scaleFactor) {
    // ===== メインタイトル（上部中央） =====
    const titleSize = 32 * scaleFactor;
    const topMargin = 30 * scaleFactor;
    pg.fill(0);
    pg.noStroke();
    pg.textFont(boldFont);
    pg.textSize(titleSize);
    pg.textAlign(pg.CENTER, pg.TOP);
    pg.text("時間の流れ", pgWidth / 2, topMargin);
    pg.textSize(24 * scaleFactor);
    pg.text("A/眠りにつくまでの夜の時間", pgWidth / 2, topMargin + titleSize + 8 * scaleFactor);

    // ===== 意図セクション（左側） =====
    const intentX = 60 * scaleFactor;
    const intentY = topMargin + titleSize + 120 * scaleFactor;
    pg.textFont(boldFont);
    pg.textSize(20 * scaleFactor);
    pg.textAlign(pg.LEFT, pg.TOP);
    pg.fill(0);
    pg.text("意図", intentX, intentY);

    pg.textFont(titleFont);
    pg.textSize(16 * scaleFactor);
    pg.textAlign(pg.LEFT, pg.TOP);
    pg.fill(0);
    const intentText = 
        "ポスターの中に音があれば、その時間の保存のされ方に嘘がなくなるのでは？\n" +
        "と思い、デジタルで作ることを決めた。\n" +
        "格時計の真ん中をクリックすることで、音が流れる。\n" +
        "その時間に即興で弾いたピアノは文化的一日を表し\n" +
        "キーボードの音は怠惰の音である。";
    
    const lineHeight = 36 * scaleFactor;
    const lines = intentText.split("\n");
    let currentY = intentY + 40 * scaleFactor;
    for (let line of lines) {
        pg.text(line, intentX, currentY);
        currentY += lineHeight;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    extractPoints();
    prepareShapes();
    redraw();
}
