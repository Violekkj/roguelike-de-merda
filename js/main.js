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

        if (dist < 130 && (angleDiff < 1.2 || angleDiff > Math.PI * 2 - 1.2)) {
            dungeon.currentBoss.takeDamage(15);
            createHitEffect(dungeon.currentBoss.x, dungeon.currentBoss.y, '#fff');
        }

        setTimeout(() => {
            player.isAttacking = false;
            player.attackType = null;
        }, 200);
    }

    // Arco (Botão Dir)
    if (mouse.rightClick && !player.isAttacking) {
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
    // Piso de masmorra escuro
    const bgGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    bgGradient.addColorStop(0, '#2d2d2d'); // Pedra mais clara no centro
    bgGradient.addColorStop(1, '#0f0f0f'); // Escuridão nas bordas
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas de paralelepípedos/ladrilhos de pedra
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    const gridSize = 80;
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

    // Paredes da masmorra
    const margin = 20;
    ctx.strokeStyle = '#1a100a'; // Madeira escura/Pedra musgo
    ctx.lineWidth = 15;
    ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

    // Pilares e Tochas nos cantos
    ctx.fillStyle = '#1c1c1c';
    const pilarSize = 50;
    const corners = [
        [margin, margin],
        [canvas.width - margin - pilarSize, margin],
        [margin, canvas.height - margin - pilarSize],
        [canvas.width - margin - pilarSize, canvas.height - margin - pilarSize]
    ];

    corners.forEach(([px, py]) => {
        // Base de pedra
        ctx.fillRect(px, py, pilarSize, pilarSize);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, pilarSize - 8, pilarSize - 8);
        
        // Fogo da tocha (animação simples baseada no tempo)
        const flicker = Math.random() * 5;
        ctx.fillStyle = '#ff6600';
        ctx.shadowBlur = 30 + flicker;
        ctx.shadowColor = '#ff4500';
        
        ctx.beginPath();
        ctx.arc(px + pilarSize / 2, py + pilarSize / 2, 8 + flicker/3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffcc00'; // Centro mais quente da chama
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px + pilarSize / 2, py + pilarSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Símbolo rúnico no centro da sala
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 130, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Triangulo interno da runa
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2 - 110);
    ctx.lineTo(canvas.width / 2 - 95, canvas.height / 2 + 55);
    ctx.lineTo(canvas.width / 2 + 95, canvas.height / 2 + 55);
    ctx.closePath();
    ctx.stroke();
}

// Efeitos Visuais
let particles = [];
function createHitEffect(x, y, color, impactType) {
    let pColor = color; // Cor por default (espada/flecha)

    // Se houver um tipo específico de impacto (Mágicas dos bosses)
    if (impactType) {
        switch(impactType) {
            case 'poison': pColor = '#32cd32'; break;
            case 'ice': pColor = '#00ffff'; break;
            case 'fireball':
            case 'meteor': pColor = '#ff4500'; break;
            case 'bone': pColor = '#eeeeee'; break;
            case 'shadow_burst':
            case 'void': pColor = '#4b0082'; break;
            case 'blood_orb': pColor = '#8b0000'; break;
        }
    } else {
        // Impactos físicos padrões (Sangue do boss ou faísca da flecha)
        const isBlood = color === '#fff' ? false : true; 
        pColor = isBlood ? '#8b0000' : '#ffcc00';
    }
    
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            radius: Math.random() * 4,
            color: pColor,
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
