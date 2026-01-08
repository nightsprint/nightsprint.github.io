
/* ===== ELEMENTS ===== */
const game = document.getElementById("game-container");
const player = document.getElementById("player");
const hud = document.getElementById("hud");
const startUI = document.getElementById("start");
const overUI = document.getElementById("over");
const pauseUI = document.getElementById("pause");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const moon = document.getElementById("moon");
const volumeSlider = document.getElementById("volume");

/* ===== GAME STATE ===== */
let playing = false, paused = false;
let score = 0;

// 🟢 saved coins load karo
let coins = parseInt(localStorage.getItem("nightSprintCoins")) || 0;

let y = 0, vy = 0, jumping = false;
const gravity = 0.8;
const baseSpeed = 5, maxSpeed = 8;
let speed = baseSpeed;
let lastTime = performance.now();
let obstacleTimer = 0, coinTimer = 0;

/* ===== AUDIO ===== */
let audioCtx, masterGain;
let currentVolume = parseFloat(volumeSlider.value);
const scale = [220, 247, 294, 330, 392];

/* ===== MUTE BUTTON ===== */
const muteBtn = document.getElementById("muteBtn");
let lastVolume = currentVolume;

muteBtn.onclick = () => {
    if (!masterGain) initAudio();

    if (masterGain.gain.value > 0) {
        lastVolume = masterGain.gain.value;
        masterGain.gain.value = 0;
        volumeSlider.value = 0;
        muteBtn.textContent = "🔇";
    } else {
        masterGain.gain.value = lastVolume || 0.7;
        volumeSlider.value = masterGain.gain.value;
        muteBtn.textContent = "🔊";
    }
};


function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = currentVolume;
        masterGain.connect(audioCtx.destination);
    }
    audioCtx.resume();
}

function tone(freq, vol, dur) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(audioCtx.currentTime + dur);
}

function startBG() { setInterval(() => { tone(scale[Math.floor(Math.random() * scale.length)], 0.15, 1.6); }, 1200); }
function jumpSound() { tone(scale[Math.floor(Math.random() * scale.length)] * 2, 0.35, 0.25); }
function coinSound() { tone(880, 0.25, 0.15); }
let bgStarted = false;

volumeSlider.oninput = e => {
    currentVolume = parseFloat(e.target.value);

    if (!audioCtx) {
        initAudio();
    }

    if (!bgStarted && currentVolume > 0) {
        startBG();
        bgStarted = true;
    }

    if (masterGain) masterGain.gain.value = currentVolume;
};


/* ===== STARS ===== */
const stars = [];
for (let i = 0; i < 80; i++) {
    const s = document.createElement("div");
    const type = Math.random();
    s.className = "star " + (type < 0.4 ? "white" : type < 0.7 ? "blue" : "pink");
    s.style.width = s.style.height = 1 + Math.random() * 2 + "px";
    s.style.left = Math.random() * innerWidth + "px";
    s.style.top = Math.random() * innerHeight * 0.55 + "px";
    game.appendChild(s);
    stars.push({ el: s, x: parseFloat(s.style.left), speed: Math.random() * 0.2 + 0.05, t: Math.random() });
}

/* ===== PLAYER ===== */
function jump() {
    if (!playing || paused || jumping) return;
    initAudio();
    vy = 13;
    jumping = true;
    jumpSound();
}
document.addEventListener("keydown", e => { if (e.code === "Space") jump(); });
document.addEventListener("mousedown", jump);
document.addEventListener("touchstart", jump, { passive: true });

/* ===== OBSTACLE POOL ===== */
const maxObstacles = 10;
const maxCoins = 10;
const obstacles = [];
const coinsArray = [];

// create pools
for (let i = 0; i < maxObstacles; i++) {
    const o = document.createElement("div");
    o.className = "obs square"; o.style.display = "none";
    game.appendChild(o);
    obstacles.push({ el: o, active: false, x: 0 });
}
for (let i = 0; i < maxCoins; i++) {
    const c = document.createElement("div");
    c.className = "coin"; c.style.display = "none";
    game.appendChild(c);
    coinsArray.push({ el: c, active: false, x: 0, y: 0 });
}
/* ===== MAGNET POOL ===== */
const maxMagnets = 2; // max 2 magnets ek time me
const magnetsArray = [];

for (let i = 0; i < maxMagnets; i++) {
    const m = document.createElement("div");
    m.className = "magnet";
    m.style.display = "none";
    game.appendChild(m);
    magnetsArray.push({ el: m, active: false, x: 0, y: 0 });
}

// magnet state
let magnetActive = false;
let magnetTimer = 0;

/* ===== SPAWN ===== */
const minDistance = 300; // Player से minimum distance
function spawnObstacle() {
    const o = obstacles.find(ob => !ob.active);
    if (!o) return;

    o.active = true;
    o.x = player.offsetLeft + minDistance + Math.random() * 200;

    // shapes
    const types = ["square", "rectangle", "circle", "pentagon", "stick"];
    let type = types[Math.floor(Math.random() * types.length)];

    // ⭐ rare golden chance (5%)
    const isGolden = Math.random() < 0.05;

    // reset
    o.el.className = "obs";
    o.el.style.display = "block";
    o.el.style.left = o.x + "px";
    o.el.style.clipPath = "none";

   // ⭐ rare triangle obstacle chance (5%)
const isTriangle = Math.random() < 0.05;

// reset
o.el.style.display = "block";
o.el.style.left = o.x + "px";
o.el.style.clipPath = "none";

// 🎨 random color for all obstacles
const color = `hsl(${Math.random() * 360},85%,60%)`;
o.el.style.background = color;
o.el.style.boxShadow = "0 0 15px currentColor";

// triangle rare
if (isTriangle) {
    o.el.className = "obs triangle";
    o.el.style.width = "0";
    o.el.style.height = "0";
    o.el.style.background = "none";
    o.el.style.borderLeft = "18px solid transparent";
    o.el.style.borderRight = "18px solid transparent";
    o.el.style.borderBottom = `36px solid ${color}`;
} else {
    // normal shapes
    const types = ["square", "rectangle", "circle", "pentagon", "stick"];
    let type = types[Math.floor(Math.random() * types.length)];

    o.el.className = "obs"; // reset
    if (type === "square") { o.el.style.width = "32px"; o.el.style.height = "32px"; o.el.style.borderRadius = "6px"; }
    if (type === "rectangle") { o.el.style.width = "50px"; o.el.style.height = "28px"; o.el.style.borderRadius = "6px"; }
    if (type === "circle") { o.el.style.width = "32px"; o.el.style.height = "32px"; o.el.style.borderRadius = "50%"; }
    if (type === "pentagon") { 
        o.el.style.width = "36px"; o.el.style.height = "36px"; o.el.style.borderRadius = "0"; 
        o.el.style.clipPath = "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"; 
    }
    if (type === "stick") { o.el.style.width = "14px"; o.el.style.height = "50px"; o.el.style.borderRadius = "8px"; }
}

}
function spawnMagnet() {
    const m = magnetsArray.find(mg => !mg.active);
    if (!m) return;

    let tries = 0;
    let posX, posY;
    do {
        posX = player.offsetLeft + minDistance + Math.random() * 500;
        posY = 120 + Math.random() * 80;
        tries++;
    } while (
        (coinsArray.some(c => c.active && Math.abs(c.x - posX) < 50 && Math.abs(c.y - posY) < 50)) ||
        (obstacles.some(ob => ob.active && Math.abs(ob.x - posX) < 50)) ||
        (magnetsArray.some(m2 => m2.active && Math.abs(m2.x - posX) < 50 && Math.abs(m2.y - posY) < 50)) &&
        tries < 10
    );

    m.active = true;
    m.x = posX;
    m.y = posY;
    m.el.style.left = m.x + "px";
    m.el.style.bottom = m.y + "px";
    m.el.style.display = "block";
}


function spawnCoin() {
    const c = coinsArray.find(cn => !cn.active);
    if (!c) return;
    c.active = true;
    c.x = player.offsetLeft + minDistance + Math.random() * 300;
    c.y = 120 + Math.random() * 80;
    c.el.style.left = c.x + "px";
    c.el.style.bottom = c.y + "px";
    c.el.style.display = "block";
}
function updateMagnets(delta) {
    magnetsArray.forEach(m => {
        if (!m.active) return;

        m.x -= speed * delta;
        m.el.style.left = m.x + "px";

        if (hit(player, m)) {
            m.active = false;
            m.el.style.display = "none";
            magnetActive = true;
            magnetTimer = 10000; // 10 sec
        }

        if (m.x < -50) {
            m.active = false;
            m.el.style.display = "none";
        }
    });

    if (magnetActive) {
        magnetTimer -= delta * 16.66;
        if (magnetTimer <= 0) magnetActive = false;

        // attract coins
        coinsArray.forEach(c => {
            if (!c.active) return;
            const dx = player.offsetLeft - c.x;
            const dy = (-y + 104) - c.y;
            c.x += dx * 0.05;
            c.y += dy * 0.05;
            c.el.style.left = c.x + "px";
            c.el.style.bottom = c.y + "px";
        });
    }
}

/* ===== COLLISION ===== */
function hit(a, b) {
    const A = a.getBoundingClientRect();
    const B = b.el.getBoundingClientRect();
    return !(A.right < B.left || A.left > B.right || A.bottom < B.top || A.top > B.bottom);
}

/* ===== PAUSE ===== */
function togglePause() {
    paused = !paused;
    pauseUI.style.display = paused ? "flex" : "none";
}
document.getElementById("pauseBtn").onclick = togglePause;
window.resumeGame = () => { paused = false; pauseUI.style.display = "none"; };

/* ===== START ===== */
startBtn.onclick = () => {
    score = 0;
    speed = baseSpeed;
    y = 0; vy = 0; jumping = false;

    obstacles.forEach(o => { o.active = false; o.el.style.display = "none"; });
    coinsArray.forEach(c => { c.active = false; c.el.style.display = "none"; });

    obstacleTimer = 0;
    coinTimer = 0;

    playing = true;
    paused = false;

    startUI.style.display = "none";
    lastTime = performance.now();

    // ❌ no sound autoplay here
    requestAnimationFrame(loop);
};


/* ===== MAIN LOOP ===== */
function loop(now = performance.now()) {
    let delta = (now - lastTime) / 16.66;
    lastTime = now;
    if (delta > 2) delta = 2; // clamp delta

    if (playing && !paused) {
        // stars move
        stars.forEach(s => {
            s.x -= s.speed * delta;
            if (s.x < -10) s.x = innerWidth + 10;
            s.el.style.left = s.x + "px";
            s.el.style.opacity = 0.4 + Math.abs(Math.sin(now * 0.002 + s.t));
        });

        // player physics
        vy -= gravity * delta;
        y += vy * delta;
        if (y < 0) { y = 0; vy = 0; jumping = false; }
        player.style.transform = `translateY(${-y}px)`;

        // spawn obstacles
        obstacleTimer += delta * 16.66;
        if (obstacleTimer >= 950) { spawnObstacle(); obstacleTimer = 0; }

        // spawn coins
        coinTimer += delta * 16.66;
        if (coinTimer >= 1200) { spawnCoin(); coinTimer = 0; }

        // spawn magnets rare
       if (Math.random() < 0.0003) spawnMagnet(); // 0.03% chance per frame

        // update magnets
        updateMagnets(delta);


        // move obstacles
        obstacles.forEach(o => {
            if (!o.active) return;
            o.x -= speed * delta;
            o.el.style.left = o.x + "px";
            if (hit(player, o)) { playing = false; overUI.style.display = "flex"; }
            if (o.x < -150) { o.active = false; o.el.style.display = "none"; }
        });
        function updateMagnets(delta) {
            magnetsArray.forEach(m => {
                if (!m.active) return;

                m.x -= speed * delta;
                m.el.style.left = m.x + "px";

                if (hit(player, m)) {
                    m.active = false;
                    m.el.style.display = "none";
                    magnetActive = true;
                    magnetTimer = 10000; // 10 sec
                }

                if (m.x < -50) {
                    m.active = false;
                    m.el.style.display = "none";
                }
            });

            if (magnetActive) {
                magnetTimer -= delta * 16.66;
                if (magnetTimer <= 0) magnetActive = false;

                // attract coins
                coinsArray.forEach(c => {
                    if (!c.active) return;
                    const dx = player.offsetLeft - c.x;
                    const dy = (-y + 104) - c.y;
                    c.x += dx * 0.05;
                    c.y += dy * 0.05;
                    c.el.style.left = c.x + "px";
                    c.el.style.bottom = c.y + "px";
                });
            }
        }

        // move coins
        coinsArray.forEach(c => {
            if (!c.active) return;
            c.x -= speed * delta;
            c.el.style.left = c.x + "px";
            if (hit(player, c)) {
                coins++;
                c.active = false;
                c.el.style.display = "none";
                coinSound();
                // 🟢 coins save
                localStorage.setItem("nightSprintCoins", coins);
            }
            if (c.x < -50) { c.active = false; c.el.style.display = "none"; }
        });

        // score & speed
        score += Math.round(delta);
        speed = baseSpeed + score / 500;
        if (speed > maxSpeed) speed = maxSpeed;

        hud.textContent = `Score: ${score} | Coins: ${coins}`;
    }

    requestAnimationFrame(loop);
}
/* ===== SHOP ===== */
const shopBtn = document.getElementById("shopBtn");
const shopUI = document.getElementById("shop");
const shopItemsContainer = document.getElementById("shop-items");

// 5 player skins
const playerSkins = [
    { name: "Blue Neon", cost: 50, color: "linear-gradient(135deg,#22d3ee,#e0f2fe)" },
    { name: "Pink Glow", cost: 100, color: "linear-gradient(135deg,#f472b6,#fcd34d)" },
    { name: "Green Laser", cost: 150, color: "linear-gradient(135deg,#22c55e,#a3e635)" },
    { name: "Purple Storm", cost: 200, color: "linear-gradient(135deg,#8b5cf6,#c084fc)" },
    { name: "Red Flame", cost: 250, color: "linear-gradient(135deg,#f87171,#ef4444)" }
];

// 🟢 Load owned skins & current skin from localStorage
let ownedSkins = JSON.parse(localStorage.getItem("nightSprintOwnedSkins")) || [];
let currentSkin = localStorage.getItem("nightSprintCurrentSkin") || player.style.background;
player.style.background = currentSkin;

function openShop() {
    paused = true;
    shopUI.style.display = "flex";
    renderShopItems();
}

function closeShop() {
    paused = false;
    shopUI.style.display = "none";
}

function renderShopItems() {
    shopItemsContainer.innerHTML = "";
    playerSkins.forEach((item, i) => {
        const div = document.createElement("div");
        div.className = "shop-item";

        // Determine button text
        let status = ownedSkins.includes(item.name) ? "OWNED" : (coins >= item.cost ? "BUY" : "LOCKED");
        div.innerHTML = `
            <span>${item.name} - ${item.cost} 💰</span>
            <button id="buy${i}" ${status === "LOCKED" ? "disabled" : ""}>${status}</button>
        `;
        shopItemsContainer.appendChild(div);

        const btn = document.getElementById(`buy${i}`);
        btn.onclick = () => {
            if (ownedSkins.includes(item.name)) {
                // Already owned → just apply
                player.style.background = item.color;
                currentSkin = item.color;
                localStorage.setItem("nightSprintCurrentSkin", currentSkin);
                alert(`${item.name} applied!`);
            } else if (coins >= item.cost) {
                // Purchase
                coins -= item.cost;
                localStorage.setItem("nightSprintCoins", coins);

                ownedSkins.push(item.name);
                localStorage.setItem("nightSprintOwnedSkins", JSON.stringify(ownedSkins));

                // Apply skin
                player.style.background = item.color;
                currentSkin = item.color;
                localStorage.setItem("nightSprintCurrentSkin", currentSkin);

                alert(`${item.name} unlocked and applied!`);
            }
            renderShopItems();
            hud.textContent = `Score: ${score} | Coins: ${coins}`;
        }
    });
}

shopBtn.onclick = openShop;

/* ===== FULLSCREEN FIX ===== */
const fullscreenBtn = document.getElementById("fullscreenBtn");
const gameContainer = document.getElementById("game-container");

fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.webkitRequestFullscreen) { // Safari
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) { // IE/Edge
            gameContainer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
};
function restartGame() {
    overUI.style.display = "none";

    score = 0;
    speed = baseSpeed;
    y = 0;
    vy = 0;
    jumping = false;

    obstacles.forEach(o => {
        o.active = false;
        o.el.style.display = "none";
    });

    coinsArray.forEach(c => {
        c.active = false;
        c.el.style.display = "none";
    });

    obstacleTimer = 0;
    coinTimer = 0;

    playing = true;
    paused = false;
    lastTime = performance.now();

    requestAnimationFrame(loop);
}
document.getElementById('year').textContent = new Date().getFullYear();
