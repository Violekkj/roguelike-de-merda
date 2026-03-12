class Boss {
    constructor(config) {
        this.name = config.name;
        this.maxHealth = config.health;
        this.health = config.health;
        this.color = config.color;
        this.radius = config.radius;
        this.theme = config.visualTheme; // 'skeleton', 'slime', 'dragon', etc.

        this.x = 450;
        this.y = 200;

        this.state = 'idle';
        this.telegraphTimer = 0;
        this.telegraphDuration = 800; // Será sobrescrito pelo ataque
        this.lastAttackTime = 0;
        this.attackCooldown = config.cooldown;
        this.patterns = config.patterns;

        this.projectiles = [];
        this.moveAngle = 0;

        // Movimentação
        this.moveType = config.moveType;
        this.speed = config.speed;
        this.lastTeleport = 0;

        // Animação
        this.scalePulse = 1;
        this.bobbing = 0;
        this.teleportDest = null;
    }

    update(player, deltaTime, canvasWidth, canvasHeight) {
        if (this.health <= 0) return;

        // --- ANIMAÇÃO BÁSICA ---
        this.stepPhase = (this.stepPhase || 0) + 0.15;
        this.walkBob = Math.abs(Math.sin(this.stepPhase)) * (this.radius * 0.1); 
        this.walkTilt = Math.sin(this.stepPhase) * 0.1; 

        // --- LÓGICA DE MOVIMENTO ---
        if (this.state !== 'attacking') {
            if (this.moveType === 'chase') {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > this.radius + 10) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            } else if (this.moveType === 'patrol') {
                if (!this.patrolDir) this.patrolDir = 1;
                this.x += this.patrolDir * this.speed;
                if (this.x > canvasWidth - 150 || this.x < 150) {
                    this.patrolDir *= -1;
                }
                const groundY = 200;
                this.y += (groundY - this.y) * 0.05;
            } else if (this.moveType === 'wander') {
                this.moveAngle += (Math.random() - 0.5) * 0.1;
                this.x += Math.cos(this.moveAngle) * this.speed;
                this.y += Math.sin(this.moveAngle * 0.5) * (this.speed * 0.5);
            } else if (this.moveType === 'hover') {
                this.y = 150 + Math.sin(Date.now() / 500) * 30;
                this.x += (player.x - this.x) * 0.02; // Segue devagar pelo eixo X
            } else if (this.moveType === 'teleport') {
                if (Date.now() - this.lastTeleport > 3000) {
                    if (!this.teleportDest) {
                        this.teleportDest = {
                            x: 100 + Math.random() * (canvasWidth - 200),
                            y: 100 + Math.random() * (canvasHeight - 200)
                        };
                    }
                    this.x += (this.teleportDest.x - this.x) * 0.1;
                    this.y += (this.teleportDest.y - this.y) * 0.1;
                    const dTeleport = Math.hypot(this.teleportDest.x - this.x, this.teleportDest.y - this.y);
                    if (dTeleport < 10) {
                        this.lastTeleport = Date.now();
                        this.teleportDest = null;
                    }
                }
            }
        }

        // Manter dentro da tela
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (this.state === 'idle') {
            if (Date.now() - this.lastAttackTime > this.attackCooldown) {
                this.state = 'telegraphing';
                this.telegraphTimer = 0;
            }
        }

        if (this.state === 'telegraphing') {
            this.telegraphTimer += deltaTime;
            if (this.telegraphTimer >= this.telegraphDuration) {
                this.performAttack(player);
            }
        }

        // Atualizar projéteis
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            let hit = false;
            const dx = p.x - player.x;
            const dy = p.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (p.type === 'laser') {
                if (dist < player.radius + 15) player.takeDamage(1);
            } else if (p.type === 'line') {
                if (dist < player.radius + 25) hit = true;
            } else {
                if (dist < player.radius + p.radius) hit = true;
            }

            if (hit) {
                player.takeDamage(10);
                // Chama a partícula global (que agora suporta tipos mágicos)
                if (typeof createHitEffect === 'function') {
                    createHitEffect(player.x, player.y, null, p.type);
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            if (p.x < -200 || p.x > canvasWidth + 200 || p.y < -200 || p.y > canvasHeight + 200) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    performAttack(player) {
        this.state = 'attacking';
        // Escolhe um ataque aleatório dos padrões definidos pro boss
        const pattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angleToPlayer = Math.atan2(dy, dx);

        const createProj = (vx, vy, size, pType, lifetime) => {
            this.projectiles.push({
                x: this.x, y: this.y, vx, vy, size, type: pType, active: true, lifetime: lifetime || 300, birth: Date.now()
            });
        };

        // --- BIBLIOTECA DE PATTERNS DE ATAQUE ---
        switch (pattern) {
            case 'slow_blood_orb':
                createProj(Math.cos(angleToPlayer) * 3, Math.sin(angleToPlayer) * 3, 20, 'blood_orb', 500);
                break;
            case 'bone_throw':
                createProj(Math.cos(angleToPlayer - 0.2) * 5, Math.sin(angleToPlayer - 0.2) * 5, 10, 'bone', 300);
                createProj(Math.cos(angleToPlayer + 0.2) * 5, Math.sin(angleToPlayer + 0.2) * 5, 10, 'bone', 300);
                break;
            case 'dash_strike':
                this.x += Math.cos(angleToPlayer) * 150; // Bone dash
                this.y += Math.sin(angleToPlayer) * 150;
                break;
            case 'fireball_spread':
                for(let i = -2; i <= 2; i++) {
                    createProj(Math.cos(angleToPlayer + i*0.2)*6, Math.sin(angleToPlayer + i*0.2)*6, 8, 'fireball', 200);
                }
                break;
            case 'fire_nova':
                for(let i = 0; i < Math.PI*2; i+= Math.PI/4) {
                    createProj(Math.cos(i)*4, Math.sin(i)*4, 12, 'fireball', 150);
                }
                break;
            case 'sword_wave':
                createProj(Math.cos(angleToPlayer) * 8, Math.sin(angleToPlayer) * 8, 30, 'wave', 150);
                break;
            case 'heavy_slam':
                for(let i = 0; i < Math.PI*2; i+= Math.PI/6) {
                    createProj(Math.cos(i)*6, Math.sin(i)*6, 8, 'rock', 80);
                }
                break;
            case 'poison_spit':
                createProj(Math.cos(angleToPlayer) * 7, Math.sin(angleToPlayer) * 7, 25, 'poison', 400);
                break;
            case 'slime_split':
                for(let i=0; i<8; i++) {
                    createProj((Math.random()-0.5)*5, (Math.random()-0.5)*5, 15, 'poison', 350);
                }
                break;
            case 'dagger_fan':
                for(let i = -1; i <= 1; i++) {
                    createProj(Math.cos(angleToPlayer + i*0.1)*12, Math.sin(angleToPlayer + i*0.1)*12, 6, 'dagger', 100);
                }
                break;
            case 'shadow_step':
                this.x = player.x + (Math.random()-0.5)*200;
                this.y = player.y + (Math.random()-0.5)*200;
                createProj(Math.cos(angleToPlayer)*8, Math.sin(angleToPlayer)*8, 10, 'shadow_burst', 50);
                break;
            case 'ice_spike':
                createProj(Math.cos(angleToPlayer) * 10, Math.sin(angleToPlayer) * 10, 15, 'ice', 200);
                break;
            case 'frost_nova':
                for(let i = 0; i < Math.PI*2; i+= Math.PI/8) {
                    createProj(Math.cos(i)*5, Math.sin(i)*5, 10, 'ice', 150);
                }
                break;
            case 'fire_wave':
                createProj(Math.cos(angleToPlayer-0.1)*7, Math.sin(angleToPlayer-0.1)*7, 25, 'fireball', 250);
                createProj(Math.cos(angleToPlayer+0.1)*7, Math.sin(angleToPlayer+0.1)*7, 25, 'fireball', 250);
                break;
            case 'meteor_strike':
                for(let i=0; i<4; i++) {
                    let spread = (Math.random() - 0.5);
                    createProj(Math.cos(angleToPlayer + spread)*9, Math.sin(angleToPlayer + spread)*9, 18, 'meteor', 250);
                }
                break;
            case 'void_rings':
                createProj(Math.cos(angleToPlayer) * 4, Math.sin(angleToPlayer) * 4, 35, 'void', 300);
                break;
            case 'teleport_blast':
                this.teleportDest = {x: player.x, y: player.y};
                createProj(0, 0, 80, 'void_explosion', 40); 
                break;
            case 'flame_breath':
                for(let i=0; i<6; i++) {
                    setTimeout(() => {
                        createProj(Math.cos(angleToPlayer + (Math.random()-0.5)*0.2)*11, Math.sin(angleToPlayer + (Math.random()-0.5)*0.2)*11, 15, 'fireball', 150);
                    }, i*100);
                }
                break;
            case 'tail_whip':
                createProj(Math.cos(angleToPlayer)*15, Math.sin(angleToPlayer)*15, 40, 'wave', 100);
                break;
            case 'meteor_shower':
                for(let i=0; i<12; i++) {
                    createProj((Math.random()-0.5)*10, (Math.random()-0.5)*10, 20, 'meteor', 200);
                }
                break;
            default:
                createProj(Math.cos(angleToPlayer) * 5, Math.sin(angleToPlayer) * 5, 20, 'blood_orb', 200);
        }

        this.lastAttackTime = Date.now();
        setTimeout(() => { if (this.health > 0) this.state = 'idle'; }, 600);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    draw(ctx) {
        if (this.health <= 0) return;

        // --- ANIMAÇÃO DE CORPO (BOB E TILT) ---
        ctx.save();
        ctx.translate(this.x, this.y - this.walkBob);
        ctx.rotate(this.walkTilt);
        ctx.translate(-this.x, -(this.y - this.walkBob));

        // Desenhar Pernas (Simples animação de "andando")
        this.drawLegs(ctx);

        this.projectiles.forEach(p => {
            ctx.save();
            ctx.shadowBlur = 15; 
            
            ctx.translate(p.x, p.y);
            
            switch(p.type) {
                case 'blood_orb':
                    ctx.fillStyle = '#8b0000'; ctx.shadowColor = '#ff0000';
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
                    break;
                case 'bone':
                    ctx.fillStyle = '#fff'; ctx.shadowColor = '#eee';
                    ctx.rotate(Date.now()/100);
                    ctx.fillRect(-p.size, -p.size/3, p.size*2, p.size/1.5);
                    break;
                case 'fireball':
                case 'meteor':
                    ctx.fillStyle = '#ff4500'; ctx.shadowColor = '#ff8c00';
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0, 0, p.size*0.6, 0, Math.PI*2); ctx.fill();
                    break;
                case 'wave':
                    ctx.fillStyle = this.color; ctx.shadowColor = this.color;
                    ctx.rotate(Math.atan2(p.vy, p.vx));
                    ctx.beginPath(); ctx.arc(0, 0, p.size, -Math.PI/2, Math.PI/2); ctx.fill();
                    break;
                case 'rock':
                    ctx.fillStyle = '#404040'; ctx.shadowColor = '#111';
                    ctx.fillRect(-p.size, -p.size, p.size*2, p.size*2);
                    break;
                case 'poison':
                    ctx.fillStyle = '#32cd32'; ctx.shadowColor = '#00ff00';
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
                    break;
                case 'dagger':
                    ctx.fillStyle = '#aaa'; ctx.shadowColor = '#fff';
                    ctx.rotate(Math.atan2(p.vy, p.vx));
                    ctx.beginPath(); ctx.moveTo(p.size, 0); ctx.lineTo(-p.size, -p.size/2); ctx.lineTo(-p.size, p.size/2); ctx.fill();
                    break;
                case 'shadow_burst':
                    ctx.fillStyle = '#4b0082'; ctx.shadowColor = '#800080';
                    ctx.fillRect(-p.size, -p.size, p.size*2, p.size*2);
                    break;
                case 'ice':
                    ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ced1';
                    ctx.rotate(Math.atan2(p.vy, p.vx));
                    ctx.beginPath(); ctx.moveTo(p.size, 0); ctx.lineTo(-p.size, -p.size/2); ctx.lineTo(-p.size, p.size/2); ctx.fill();
                    break;
                case 'void':
                case 'void_explosion':
                    ctx.strokeStyle = '#800080'; ctx.shadowColor = '#da70d6'; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.stroke();
                    break;
                default:
                    ctx.fillStyle = this.color; ctx.shadowColor = this.color;
                    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
            }
            
            ctx.restore();
        });

        this.drawThemedBody(ctx);
        ctx.restore();

        this.drawHealthBar(ctx);
    }

    drawLegs(ctx) {
        ctx.save();
        ctx.fillStyle = '#333';
        const legW = 10;
        const legH = 20;
        const legOffset = 15;

        // Perna Esquerda
        const leftLegY = this.y + this.radius - 10 + (Math.sin(this.stepPhase) * 10);
        ctx.fillRect(this.x - legOffset - legW / 2, leftLegY, legW, legH);

        // Perna Direita
        const rightLegY = this.y + this.radius - 10 + (Math.sin(this.stepPhase + Math.PI) * 10);
        ctx.fillRect(this.x + legOffset - legW / 2, rightLegY, legW, legH);
        ctx.restore();
    }

    drawThemedBody(ctx) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#000'; // Sombra padrão
        ctx.fillStyle = this.color;

        // Se preparou ataque, mostra telégrafo vermelho
        if (this.state === 'telegraphing') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            
            // Círculo mágico de ataque (Se magos ou dragão)
            if (['apprentice', 'cultist', 'priestess', 'dragon'].includes(this.theme)) {
                ctx.strokeStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 30, this.telegraphTimer/100, Math.PI + this.telegraphTimer/100);
                ctx.stroke();
            }
        }

        switch(this.theme) {
            case 'apprentice':
                // Manto simples
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.radius);
                ctx.lineTo(this.x + this.radius, this.y + this.radius);
                ctx.lineTo(this.x - this.radius, this.y + this.radius);
                ctx.closePath();
                ctx.fill();
                // Fenda do capuz
                ctx.fillStyle = '#0a0a0a';
                ctx.beginPath(); ctx.arc(this.x, this.y - 10, 15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = this.color; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x - 5, this.y - 12, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 5, this.y - 12, 3, 0, Math.PI*2); ctx.fill();
                break;

            case 'skeleton':
                // Caveira Brutal (Ossos gigantes)
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(this.x, this.y - 10, this.radius, 0, Math.PI*2); ctx.fill();
                ctx.fillRect(this.x - this.radius + 15, this.y, this.radius - 15, this.radius);
                // Olhos vazios
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(this.x - 15, this.y - 20, 12, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 15, this.y - 20, 12, 0, Math.PI*2); ctx.fill();
                // Fogo nos olhos
                ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x - 15, this.y - 20, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 15, this.y - 20, 4, 0, Math.PI*2); ctx.fill();
                break;

            case 'cultist':
                // Cultista das Chamas (Manto chifrudo)
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.radius - 15);
                ctx.lineTo(this.x + this.radius, this.y + this.radius);
                ctx.lineTo(this.x - this.radius, this.y + this.radius);
                ctx.closePath();
                ctx.fill();
                // Chifres do capuz
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.moveTo(this.x - 15, this.y - 20); ctx.lineTo(this.x - 30, this.y - 40); ctx.lineTo(this.x - 5, this.y - 15); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 15, this.y - 20); ctx.lineTo(this.x + 30, this.y - 40); ctx.lineTo(this.x + 5, this.y - 15); ctx.fill();
                // Face negra
                ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI*2); ctx.fill(); // Third eye
                break;

            case 'fallen_knight':
                // Cavaleiro Caído (Armadura Negra)
                ctx.fillStyle = '#222';
                ctx.fillRect(this.x - this.radius, this.y - this.radius + 10, this.radius * 2, this.radius * 2 - 10);
                // Capa ou penacho vermelho
                ctx.fillStyle = this.color; 
                ctx.fillRect(this.x - this.radius - 8, this.y - this.radius - 15, this.radius * 2 + 16, 25);
                // Fenda do Elmo
                ctx.fillStyle = '#000';
                ctx.fillRect(this.x - 25, this.y - 10, 50, 10);
                // Brilho dos olhos
                ctx.fillStyle = '#ff4d4d'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff4d4d';
                ctx.fillRect(this.x - 10, this.y - 8, 20, 6);
                break;

            case 'slime':
                // Amontoado tóxico
                ctx.fillStyle = this.color;
                ctx.beginPath();
                for (let i = 0; i < 16; i++) {
                    const a = (Math.PI * 2 / 16) * i + this.bobbing;
                    const r = this.radius + Math.sin(this.bobbing * 8 + i * 3) * 15;
                    const px = this.x + Math.cos(a) * r;
                    const py = this.y + Math.sin(a) * r + 10;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                // Detritos flutuando dentro
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(this.x - 20, this.y, 8 + Math.sin(this.bobbing*5)*2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 25, this.y + 10, 6 + Math.cos(this.bobbing*4)*2, 0, Math.PI*2); ctx.fill();
                break;

            case 'assassin':
                // Figura ágil, esguia.
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(this.x - this.radius*.6, this.y - this.radius, this.radius*1.2, this.radius*2);
                ctx.fillStyle = '#333'; // Lenço do rosto
                ctx.fillRect(this.x - this.radius*.6, this.y - 5, this.radius*1.2, this.radius);
                ctx.fillStyle = this.color; // Olhos roxos de fenda
                ctx.shadowBlur = 15; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.moveTo(this.x - 10, this.y - 15); ctx.lineTo(this.x, this.y - 12); ctx.lineTo(this.x - 8, this.y - 10); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 10, this.y - 15); ctx.lineTo(this.x, this.y - 12); ctx.lineTo(this.x + 8, this.y - 10); ctx.fill();
                break;

            case 'golem':
                // Golem de Cristal de Gelo (Polígonos pontiagudos)
                ctx.fillStyle = '#008b8b';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.radius - 20); // Spike head
                ctx.lineTo(this.x + this.radius, this.y - 10); // Right shoulder
                ctx.lineTo(this.x + this.radius + 15, this.y + this.radius); // Right arm
                ctx.lineTo(this.x + this.radius / 2, this.y + this.radius);
                ctx.lineTo(this.x - this.radius / 2, this.y + this.radius);
                ctx.lineTo(this.x - this.radius - 15, this.y + this.radius); // Left arm
                ctx.lineTo(this.x - this.radius, this.y - 10); // Left shoulder
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.stroke();
                // Olho/Núcleo cristalino
                ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ced1';
                ctx.beginPath(); ctx.arc(this.x, this.y - 5, 12, 0, Math.PI*2); ctx.fill();
                break;

            case 'warlord':
                // Senhor das Cinzas (Capa de magma e armadura brutal)
                ctx.fillStyle = '#3d0c02';
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#111'; // Placas brutais
                ctx.fillRect(this.x - this.radius, this.y - 10, this.radius*2, 20);
                // Coroa de fogo
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.moveTo(this.x - 20, this.y - this.radius); ctx.lineTo(this.x - 30, this.y - this.radius - 25); ctx.lineTo(this.x - 10, this.y - this.radius); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius); ctx.lineTo(this.x, this.y - this.radius - 35); ctx.lineTo(this.x + 10, this.y - this.radius); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 20, this.y - this.radius); ctx.lineTo(this.x + 30, this.y - this.radius - 25); ctx.lineTo(this.x + 10, this.y - this.radius); ctx.fill();
                // Fogo saindo do peito (Núcleo ígneo)
                ctx.fillStyle = '#ffcc00'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff4500';
                ctx.beginPath(); ctx.arc(this.x, this.y + 15, 15, 0, Math.PI*2); ctx.fill();
                break;

            case 'priestess':
                // Silhouette flutuante e auras violetas
                ctx.fillStyle = '#1c0a2b';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.radius);
                // Vestido flutuante
                ctx.lineTo(this.x + this.radius, this.y + this.radius * 1.5);
                ctx.lineTo(this.x - this.radius, this.y + this.radius * 1.5);
                ctx.closePath();
                ctx.fill();
                // Halo de vazio
                ctx.strokeStyle = this.color; ctx.lineWidth = 5; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y - this.radius, 25, 0, Math.PI*2); ctx.stroke();
                // Buraco negro no lugar da face
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(this.x, this.y - this.radius + 10, 10, 0, Math.PI*2); ctx.fill();
                break;

            case 'dragon':
                // DRAGÃO (Chefe Final Gigante)
                ctx.fillStyle = '#5c1010';
                // Corpo maciço
                ctx.beginPath();
                ctx.ellipse(this.x, this.y + 20, this.radius, this.radius * 0.7, 0, 0, Math.PI*2);
                ctx.fill();
                // Asas (fechadas/abertas baseado no bobbing)
                ctx.fillStyle = '#3a0909';
                ctx.beginPath();
                ctx.moveTo(this.x - 30, this.y);
                ctx.lineTo(this.x - this.radius - 50, this.y - 80 + Math.sin(this.bobbing*2)*20);
                ctx.lineTo(this.x - this.radius - 10, this.y + 30);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(this.x + 30, this.y);
                ctx.lineTo(this.x + this.radius + 50, this.y - 80 + Math.sin(this.bobbing*2)*20);
                ctx.lineTo(this.x + this.radius + 10, this.y + 30);
                ctx.fill();
                // Cabeça
                ctx.fillStyle = '#7a1515';
                ctx.beginPath(); ctx.rect(this.x - 30, this.y - 60, 60, 70); ctx.fill();
                // Mandíbula/Focinho
                ctx.fillStyle = '#5c1010';
                ctx.fillRect(this.x - 20, this.y - 10, 40, 30);
                // Olhos dourados
                ctx.fillStyle = '#ffcc00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffcc00';
                ctx.beginPath(); ctx.ellipse(this.x - 15, this.y - 40, 8, 4, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(this.x + 15, this.y - 40, 8, 4, 0.3, 0, Math.PI*2); ctx.fill();
                break;
        }

        ctx.restore();
    }

    drawHealthBar(ctx) {
        const width = 400;
        const height = 15;
        const x = this.x - width / 2;
        const y = this.y - this.radius - 60;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(x, y, width, height);
        const hpPercent = this.health / this.maxHealth;
        if (hpPercent > 0) {
            ctx.fillStyle = this.color;
            ctx.fillRect(x, y, width * hpPercent, height);
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} (${Math.ceil(this.health)})`, this.x, y - 10);
    }
}
