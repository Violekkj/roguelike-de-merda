const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Redimensionar canvas para o container
function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resize);
resize();

// Instâncias
const dungeon = new Dungeon();
let player = new Player(canvas.width / 2, canvas.height - 100);

// Controle de Input
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Controle de Mouse (Combate)
let mouse = { x: 0, y: 0, click: false, rightClick: false };
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) mouse.click = true;
    if (e.button === 2) mouse.rightClick = true;
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.click = false;
    if (e.button === 2) mouse.rightClick = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Game Loop
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime || 0;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (dungeon.gameState === 'playing') {
        player.update(keys, mouse, deltaTime, canvas.width, canvas.height);
        dungeon.currentBoss.update(player, deltaTime, canvas.width, canvas.height);

        // Ataques do Jogador
        handleCombat();

        // Renderização
        renderBackground();
        dungeon.currentBoss.draw(ctx);
        player.draw(ctx);

        dungeon.update(player);
    }

    requestAnimationFrame(gameLoop);
}

function handleCombat() {
    // Espada (Botão Esq)
    if (mouse.click && !player.isAttacking) {
        player.isAttacking = true;
        // Lógica de hitbox da espada
        const dx = dungeon.currentBoss.x - player.x;
        const dy = dungeon.currentBoss.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 80) { // Alcance da espada
            dungeon.currentBoss.takeDamage(15);
            createHitEffect(dungeon.currentBoss.x, dungeon.currentBoss.y);
        }

        setTimeout(() => player.isAttacking = false, 300);
    }

    // Arco (Botão Dir)
    if (mouse.rightClick && player.stamina >= player.bowCost && !player.isAttacking) {
        player.stamina -= player.bowCost;
        player.isAttacking = true;

        // Disparar projétil do jogador (simples para agora)
        const dx = dungeon.currentBoss.x - player.x;
        const dy = dungeon.currentBoss.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        dungeon.currentBoss.takeDamage(8);
        createHitEffect(dungeon.currentBoss.x, dungeon.currentBoss.y);

        setTimeout(() => player.isAttacking = false, 500);
    }
}

function renderBackground() {
    // Grade futurista
    ctx.strokeStyle = 'rgba(124, 77, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Efeitos Visuais
const particles = [];
function createHitEffect(x, y) {
    // Simples efeito de flash/partícula
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

// Botões de UI
document.getElementById('start-button').addEventListener('click', () => {
    dungeon.restart();
    player = new Player(canvas.width / 2, canvas.height - 100);
});

document.getElementById('restart-button').addEventListener('click', () => {
    dungeon.restart();
    player = new Player(canvas.width / 2, canvas.height - 100);
});

document.getElementById('play-again-button').addEventListener('click', () => {
    dungeon.restart();
    player = new Player(canvas.width / 2, canvas.height - 100);
});

// Iniciar
requestAnimationFrame(gameLoop);
