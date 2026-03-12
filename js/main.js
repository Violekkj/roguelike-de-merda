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

// ===== SISTEMA DE ÁUDIO (Web Audio API) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    switch(type) {
        case 'sword':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
            break;
        case 'bow':
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'hit':
            osc.type = 'square'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'player_hit':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
            break;
        case 'dash':
            osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
            gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
            break;
        case 'boss_die':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now); osc.stop(now + 0.8);
            break;
        case 'loot':
            osc.type = 'sine'; osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
            break;
    }
}

// ===== SCREEN SHAKE =====
let shakeIntensity = 0;
let shakeDuration = 0;

function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
}

// ===== NÚMEROS DE DANO FLUTUANTES =====
let damageNumbers = [];

function createDamageNumber(x, y, amount, isPlayerDamage) {
    damageNumbers.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 20,
        amount: Math.abs(amount),
        color: isPlayerDamage ? '#ff4444' : '#ffcc00',
        prefix: isPlayerDamage ? '-' : '-',
        life: 1.0,
        vy: -2.5,
        scale: isPlayerDamage ? 1.2 : 1.0
    });
}

function updateDamageNumbers() {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y += d.vy;
        d.vy *= 0.97;
        d.life -= 0.025;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

function drawDamageNumbers() {
    damageNumbers.forEach(d => {
        ctx.save();
        ctx.globalAlpha = d.life;
        ctx.font = `bold ${16 * d.scale}px Cinzel, serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(`${d.prefix}${d.amount}`, d.x + 1, d.y + 1);
        ctx.fillStyle = d.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = d.color;
        ctx.fillText(`${d.prefix}${d.amount}`, d.x, d.y);
        ctx.restore();
    });
}

// ===== PLAYER TRAIL =====
let playerTrail = [];

function updatePlayerTrail() {
    playerTrail.push({ x: player.x, y: player.y, life: 1.0 });
    if (playerTrail.length > 8) playerTrail.shift();
    for (let i = playerTrail.length - 1; i >= 0; i--) {
        playerTrail[i].life -= 0.15;
        if (playerTrail[i].life <= 0) playerTrail.splice(i, 1);
    }
}

function drawPlayerTrail() {
    playerTrail.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life * 0.25;
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(t.x, t.y, player.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ===== TRANSIÇÃO DE SALA =====
let transition = { active: false, phase: 'none', alpha: 0, roomText: '', timer: 0 };

function startRoomTransition(roomNum, bossName) {
    transition.active = true;
    transition.phase = 'fadeOut';
    transition.alpha = 0;
    transition.roomText = `Sala ${roomNum}`;
    transition.bossText = bossName;
    transition.timer = 0;
}

function updateTransition(deltaTime) {
    if (!transition.active) return false;

    transition.timer += deltaTime;

    if (transition.phase === 'fadeOut') {
        transition.alpha = Math.min(1, transition.alpha + 0.04);
        if (transition.alpha >= 1) {
            transition.phase = 'showText';
            transition.timer = 0;
        }
    } else if (transition.phase === 'showText') {
        if (transition.timer > 1200) {
            transition.phase = 'fadeIn';
        }
    } else if (transition.phase === 'fadeIn') {
        transition.alpha = Math.max(0, transition.alpha - 0.04);
        if (transition.alpha <= 0) {
            transition.active = false;
            transition.phase = 'none';
        }
    }
    return true; // Transição ativa, bloquear input
}

function drawTransition() {
    if (!transition.active) return;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${transition.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (transition.phase === 'showText' || (transition.phase === 'fadeIn' && transition.alpha > 0.3)) {
        ctx.globalAlpha = transition.phase === 'showText' ? 1 : transition.alpha;
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 36px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#d4af37';
        ctx.fillText(transition.roomText, canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#e6dfcc';
        ctx.font = '22px Cinzel, serif';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000';
        ctx.fillText(transition.bossText, canvas.width / 2, canvas.height / 2 + 25);
    }
    ctx.restore();
}

// ===== VIGNETTE VERMELHA (LOW HP) =====
function drawLowHPVignette() {
    // 3 hits = 30 HP (cada projétil = 10 dano)
    if (player.health <= 30 && player.health > 0) {
        const pulse = 0.3 + Math.abs(Math.sin(Date.now() / 300)) * 0.2;
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(139, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(139, 0, 0, ${pulse})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ===== BOSS HP BAR (Centralizada embaixo, estilo Elden Ring) =====
function drawBossHPBar(boss) {
    if (!boss || boss.health <= 0) return;
    
    const barWidth = canvas.width * 0.6;
    const barHeight = 12;
    const x = (canvas.width - barWidth) / 2;
    const y = canvas.height - 50;
    
    // Fundo da barra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
    
    // Barra vermelha escura (Dano)
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Barra de HP atual
    const hpPercent = boss.health / boss.maxHealth;
    if (hpPercent > 0) {
        const hpGradient = ctx.createLinearGradient(x, y, x + barWidth * hpPercent, y);
        hpGradient.addColorStop(0, boss.color);
        hpGradient.addColorStop(1, '#fff');
        ctx.fillStyle = hpGradient;
        ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    }
    
    // Borda dourada
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
    
    // Nome do Boss
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#000';
    ctx.fillText(`${boss.name}`, canvas.width / 2, y - 10);
    ctx.shadowBlur = 0;
}

// ===== LOOT SYSTEM =====
let lootScreen = { active: false, options: [], selected: -1 };

const LOOT_POOL = [
    { name: 'Lâmina Afiada', desc: 'Espada causa +3 de dano', icon: '⚔️', apply: () => { player.swordBonus = (player.swordBonus || 0) + 3; }},
    { name: 'Arco Reforçado', desc: 'Flechas causam +2 de dano', icon: '🏹', apply: () => { player.bowBonus = (player.bowBonus || 0) + 2; }},
    { name: 'Poção de Vida', desc: 'Recupera 30 HP agora', icon: '❤️', apply: () => { player.health = Math.min(player.maxHealth, player.health + 30); }},
    { name: 'Coração Robusto', desc: '+15 HP Máximo', icon: '💪', apply: () => { player.maxHealth += 15; player.health += 15; }},
    { name: 'Botas Velozes', desc: '+0.5 Velocidade', icon: '👢', apply: () => { player.baseSpeed += 0.5; player.speed = player.baseSpeed; }},
    { name: 'Fonte de Mana', desc: '+0.3 Regeneração de Mana', icon: '🔮', apply: () => { player.manaRegen += 0.3; }},
    { name: 'Manto de Sombra', desc: 'Dash 20% mais barato', icon: '🌑', apply: () => { player.dashDiscount = (player.dashDiscount || 0) + 0.2; }},
    { name: 'Escamas de Dragão', desc: 'Reduz dano recebido em 2', icon: '🛡️', apply: () => { player.armor = (player.armor || 0) + 2; }},
    { name: 'Amuleto Vampírico', desc: 'Espada cura 2 HP por hit', icon: '🧛', apply: () => { player.lifeSteal = (player.lifeSteal || 0) + 2; }},
    { name: 'Corda Élfica', desc: 'Flechas 15% mais rápidas', icon: '💨', apply: () => { player.arrowSpeed = (player.arrowSpeed || 1.0) + 0.15; }},
];

function showLootScreen() {
    // Escolhe 3 opções aleatórias sem repetir
    const shuffled = [...LOOT_POOL].sort(() => Math.random() - 0.5);
    lootScreen.options = shuffled.slice(0, 3);
    lootScreen.active = true;
    lootScreen.selected = -1;
    playSound('loot');
}

function drawLootScreen() {
    if (!lootScreen.active) return;

    // Fundo escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 28px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d4af37';
    ctx.fillText('ESPÓLIO DE GUERRA', canvas.width / 2, 80);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#a89f91';
    ctx.font = '14px Cinzel, serif';
    ctx.fillText('Clique para escolher uma recompensa', canvas.width / 2, 110);

    // Cards
    const cardW = 200;
    const cardH = 180;
    const gap = 30;
    const startX = (canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = (canvas.height - cardH) / 2 - 10;

    lootScreen.options.forEach((loot, i) => {
        const cx = startX + i * (cardW + gap);
        const isHover = lootScreen.selected === i;

        // Card background
        ctx.fillStyle = isHover ? 'rgba(212, 175, 55, 0.2)' : 'rgba(20, 15, 10, 0.9)';
        ctx.fillRect(cx, cardY, cardW, cardH);
        ctx.strokeStyle = isHover ? '#d4af37' : '#3e2723';
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.strokeRect(cx, cardY, cardW, cardH);

        // Icon
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(loot.icon, cx + cardW / 2, cardY + 55);

        // Name
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 14px Cinzel, serif';
        ctx.fillText(loot.name, cx + cardW / 2, cardY + 100);

        // Description
        ctx.fillStyle = '#e6dfcc';
        ctx.font = '12px Cinzel, serif';
        // Word wrap simple
        const words = loot.desc.split(' ');
        let line = '';
        let lineY = cardY + 125;
        words.forEach(w => {
            const test = line + w + ' ';
            if (ctx.measureText(test).width > cardW - 20) {
                ctx.fillText(line, cx + cardW / 2, lineY);
                line = w + ' ';
                lineY += 16;
            } else {
                line = test;
            }
        });
        ctx.fillText(line, cx + cardW / 2, lineY);
    });
}

function handleLootClick(mx, my) {
    if (!lootScreen.active) return;

    const cardW = 200;
    const cardH = 180;
    const gap = 30;
    const startX = (canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = (canvas.height - cardH) / 2 - 10;

    lootScreen.options.forEach((loot, i) => {
        const cx = startX + i * (cardW + gap);
        if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
            loot.apply();
            lootScreen.active = false;
            playSound('loot');
            // Avançar para a próxima sala
            dungeon.currentRoom++;
            dungeon.proceedAfterLoot();
        }
    });
}

function handleLootHover(mx, my) {
    if (!lootScreen.active) return;
    const cardW = 200;
    const cardH = 180;
    const gap = 30;
    const startX = (canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = (canvas.height - cardH) / 2 - 10;

    lootScreen.selected = -1;
    lootScreen.options.forEach((loot, i) => {
        const cx = startX + i * (cardW + gap);
        if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
            lootScreen.selected = i;
        }
    });
}

// ===== Instâncias =====
const dungeon = new Dungeon();
let player = new Player(canvas.width / 2, canvas.height - 100);
let playerProjectiles = [];

// Controle de Input
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if(e.key) keys[e.key.toLowerCase()] = true; 
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    if(e.key) keys[e.key.toLowerCase()] = false;
});

window.addEventListener('blur', () => {
    for (let k in keys) { keys[k] = false; }
});

// Controle de Mouse
let mouse = { x: 0, y: 0, click: false, rightClick: false };
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    handleLootHover(mouse.x, mouse.y);
});

canvas.addEventListener('mousedown', e => {
    initAudio();
    if (e.button === 0) { mouse.click = true; handleLootClick(mouse.x, mouse.y); }
    if (e.button === 2) mouse.rightClick = true;
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.click = false;
    if (e.button === 2) mouse.rightClick = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ===== GAME LOOP =====
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime || 0;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // === SCREEN SHAKE ===
    if (shakeDuration > 0) {
        shakeDuration -= deltaTime;
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity;
        ctx.save();
        ctx.translate(sx, sy);
    }

    if (dungeon.gameState === 'playing') {
        const isSpawning = dungeon.currentBoss && dungeon.currentBoss.state === 'spawning';
        const isTransitioning = updateTransition(deltaTime);

        let activeKeys = keys;
        let activeMouse = mouse;
        
        if (isSpawning || lootScreen.active || isTransitioning) {
            activeKeys = {};
            activeMouse = { ...mouse, click: false, rightClick: false };
        }

        if (!lootScreen.active && !isTransitioning) {
            player.update(activeKeys, activeMouse, deltaTime, canvas.width, canvas.height);
            dungeon.currentBoss.update(player, deltaTime, canvas.width, canvas.height);
        }

        // Ataques do Jogador
        if (!isSpawning && !lootScreen.active && !isTransitioning) {
            handleCombat();
        }
        
        updateProjectiles();
        updateParticles(deltaTime);
        updateDamageNumbers();
        updatePlayerTrail();

        // Renderização
        renderBackground();
        drawPlayerTrail();
        dungeon.currentBoss.draw(ctx);
        drawProjectiles();
        drawParticles();
        player.draw(ctx, activeMouse);
        drawDamageNumbers();
        drawBossHPBar(dungeon.currentBoss);
        drawLowHPVignette();

        if (!isSpawning && !lootScreen.active && !isTransitioning) {
            dungeon.update(player);
        }

        // Overlays
        drawLootScreen();
        drawTransition();

    } else if (dungeon.gameState === 'loot') {
        renderBackground();
        player.draw(ctx, mouse);
        drawLootScreen();
    }

    // Restore shake transform
    if (shakeDuration > 0 || shakeDuration + deltaTime > 0) {
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

function handleCombat() {
    const swordDmg = 15 + (player.swordBonus || 0);
    const bowDmg = 10 + (player.bowBonus || 0);

    // Espada (Botão Esq) - Com cooldown real
    if (mouse.click && player.swordCooldownTimer <= 0 && !player.isAttacking) {
        player.isAttacking = true;
        player.attackType = 'sword';
        player.swordCooldownTimer = player.swordCooldownMax;
        player.swordSwingDir = player.swordSwingDir * -1; // Alterna direção do swing
        playSound('sword');

        const dx = dungeon.currentBoss.x - player.x;
        const dy = dungeon.currentBoss.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToBoss = Math.atan2(dy, dx);
        const angleDiff = Math.abs(player.angle - angleToBoss);

        if (dist < 130 && (angleDiff < 1.2 || angleDiff > Math.PI * 2 - 1.2)) {
            dungeon.currentBoss.takeDamage(swordDmg);
            createHitEffect(dungeon.currentBoss.x, dungeon.currentBoss.y, '#fff');
            createDamageNumber(dungeon.currentBoss.x, dungeon.currentBoss.y, swordDmg, false);
            triggerShake(4, 100);
            playSound('hit');
            if (player.lifeSteal) {
                player.health = Math.min(player.maxHealth, player.health + player.lifeSteal);
            }
        }

        setTimeout(() => {
            player.isAttacking = false;
            player.attackType = null;
        }, 250); // Animação de 250ms, mas cooldown real é 500ms
    }

    // Arco (Botão Dir) - Com cooldown real
    if (mouse.rightClick && player.bowCooldownTimer <= 0 && !player.isAttacking) {
        player.isAttacking = true;
        player.attackType = 'bow';
        player.bowCooldownTimer = player.bowCooldownMax;
        playSound('bow');

        const speed = 10 * (player.arrowSpeed || 1.0);
        const vx = Math.cos(player.angle) * speed;
        const vy = Math.sin(player.angle) * speed;

        playerProjectiles.push({
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            vx: vx, vy: vy,
            angle: player.angle,
            radius: 5,
            damage: bowDmg,
            trail: [] // Trail da flecha
        });

        setTimeout(() => {
            player.isAttacking = false;
            player.attackType = null;
        }, 300);
    }
}

function updateProjectiles() {
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const p = playerProjectiles[i];
        
        // Guardar trail
        if (p.trail) {
            p.trail.push({ x: p.x, y: p.y, life: 1.0 });
            if (p.trail.length > 6) p.trail.shift();
            p.trail.forEach(t => t.life -= 0.2);
        }
        
        p.x += p.vx;
        p.y += p.vy;

        const dx = p.x - dungeon.currentBoss.x;
        const dy = p.y - dungeon.currentBoss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dungeon.currentBoss.radius + p.radius) {
            const dmg = p.damage || 10;
            dungeon.currentBoss.takeDamage(dmg);
            createHitEffect(p.x, p.y, '#4dffb5');
            createDamageNumber(p.x, p.y, dmg, false);
            triggerShake(3, 80);
            playSound('hit');
            playerProjectiles.splice(i, 1);
            continue;
        }

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            playerProjectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    playerProjectiles.forEach(p => {
        // Trail luminoso da flecha
        if (p.trail) {
            p.trail.forEach(t => {
                if (t.life > 0) {
                    ctx.save();
                    ctx.globalAlpha = t.life * 0.4;
                    ctx.fillStyle = '#4dffb5';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#4dffb5';
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            });
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Aura de energia
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#4dffb5';

        // Haste de madeira (Gradiente)
        const shaftGrad = ctx.createLinearGradient(-12, 0, 12, 0);
        shaftGrad.addColorStop(0, '#5d4037');
        shaftGrad.addColorStop(1, '#8d6e63');
        ctx.fillStyle = shaftGrad;
        ctx.fillRect(-12, -1.5, 24, 3);

        // Ponta afiada brilhante
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(12, -3);
        ctx.lineTo(20, 0);
        ctx.lineTo(12, 3);
        ctx.fill();
        // Brilho na ponta
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(14, -1);
        ctx.lineTo(18, 0);
        ctx.lineTo(14, 1);
        ctx.fill();

        // Penas (Fletching) coloridas
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(-12, -1.5); ctx.lineTo(-17, -5); ctx.lineTo(-8, -1.5); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-12, 1.5); ctx.lineTo(-17, 5); ctx.lineTo(-8, 1.5); ctx.fill();
        // Segunda camada
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-10, -1.5); ctx.lineTo(-13, -3.5); ctx.lineTo(-6, -1.5); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 1.5); ctx.lineTo(-13, 3.5); ctx.lineTo(-6, 1.5); ctx.fill();

        ctx.restore();
    });
}

function renderBackground() {
    const bgGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    bgGradient.addColorStop(0, '#2d2d2d');
    bgGradient.addColorStop(1, '#0f0f0f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    const gridSize = 80;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const margin = 20;
    ctx.strokeStyle = '#1a100a';
    ctx.lineWidth = 15;
    ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

    ctx.fillStyle = '#1c1c1c';
    const pilarSize = 50;
    const corners = [
        [margin, margin],
        [canvas.width - margin - pilarSize, margin],
        [margin, canvas.height - margin - pilarSize],
        [canvas.width - margin - pilarSize, canvas.height - margin - pilarSize]
    ];

    corners.forEach(([px, py]) => {
        ctx.fillRect(px, py, pilarSize, pilarSize);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, pilarSize - 8, pilarSize - 8);
        
        const flicker = Math.random() * 5;
        ctx.fillStyle = '#ff6600';
        ctx.shadowBlur = 30 + flicker;
        ctx.shadowColor = '#ff4500';
        ctx.beginPath();
        ctx.arc(px + pilarSize / 2, py + pilarSize / 2, 8 + flicker/3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px + pilarSize / 2, py + pilarSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 130, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
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
    let pColor = color;

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
        const isBlood = color === '#fff' ? false : true; 
        pColor = isBlood ? '#8b0000' : '#ffcc00';
    }
    
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x, y: y,
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
document.getElementById('start-button').addEventListener('click', () => { initAudio(); resetGame(); });
document.getElementById('restart-button').addEventListener('click', () => { initAudio(); resetGame(); });
document.getElementById('play-again-button').addEventListener('click', () => { initAudio(); resetGame(); });

function resetGame() {
    dungeon.restart();
    player = new Player(canvas.width / 2, canvas.height - 100);
    playerProjectiles = [];
    particles = [];
    damageNumbers = [];
    playerTrail = [];
    lootScreen.active = false;
    transition.active = false;
}

// Iniciar
requestAnimationFrame(gameLoop);
