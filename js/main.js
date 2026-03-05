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
let playerProjectiles = [];

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
        updateProjectiles();
        updateParticles(deltaTime);

        // Renderização
        renderBackground();
        dungeon.currentBoss.draw(ctx);
        drawProjectiles();
        drawParticles();
        player.draw(ctx, mouse);

        dungeon.update(player);
    }

    requestAnimationFrame(gameLoop);
}

function handleCombat() {
    // Espada (Botão Esq)
    if (mouse.click && !player.isAttacking) {
        player.isAttacking = true;
        player.attackType = 'sword';

        // Lógica de hitbox da espada: Verificamos a distância e o ângulo
        const dx = dungeon.currentBoss.x - player.x;
        const dy = dungeon.currentBoss.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Ângulo entre jogador e boss
        const angleToBoss = Math.atan2(dy, dx);
        const angleDiff = Math.abs(player.angle - angleToBoss);

        if (dist < 100 && (angleDiff < 1 || angleDiff > Math.PI * 2 - 1)) {
            dungeon.currentBoss.takeDamage(15);
            createHitEffect(dungeon.currentBoss.x, dungeon.currentBoss.y, '#fff');
        }

        setTimeout(() => {
            player.isAttacking = false;
            player.attackType = null;
        }, 200);
    }

    // Arco (Botão Dir)
    if (mouse.rightClick && player.stamina >= player.bowCost && !player.isAttacking) {
        player.stamina -= player.bowCost;
        player.isAttacking = true;
        player.attackType = 'bow';

        // Criar projétil (Flecha)
        const vx = Math.cos(player.angle) * 10;
        const vy = Math.sin(player.angle) * 10;

        playerProjectiles.push({
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            vx: vx,
            vy: vy,
            angle: player.angle,
            radius: 5
        });

        setTimeout(() => {
            player.isAttacking = false;
            player.attackType = null;
        }, 400);
    }
}

function updateProjectiles() {
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const p = playerProjectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Colisão com o Boss
        const dx = p.x - dungeon.currentBoss.x;
        const dy = p.y - dungeon.currentBoss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dungeon.currentBoss.radius + p.radius) {
            dungeon.currentBoss.takeDamage(10);
            createHitEffect(p.x, p.y, '#4dffb5');
            playerProjectiles.splice(i, 1);
            continue;
        }

        // Remover se sair da tela
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            playerProjectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    playerProjectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Desenhar Flecha
        ctx.strokeStyle = '#4dffb5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();

        // Ponta da flecha
        ctx.fillStyle = '#4dffb5';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, -3);
        ctx.lineTo(5, 3);
        ctx.fill();

        ctx.restore();
    });
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
let particles = [];
function createHitEffect(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 3,
            color: color || '#fff',
            life: 1.0
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// Botões de UI
document.getElementById('start-button').addEventListener('click', () => {
    resetGame();
});

document.getElementById('restart-button').addEventListener('click', () => {
    resetGame();
});

document.getElementById('play-again-button').addEventListener('click', () => {
    resetGame();
});

function resetGame() {
    dungeon.restart();
    player = new Player(canvas.width / 2, canvas.height - 100);
    playerProjectiles = [];
    particles = [];
}

// Iniciar
requestAnimationFrame(gameLoop);
