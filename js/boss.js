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

        this.state = 'spawning';
        this.spawnTimer = 1000;
        this.telegraphTimer = 0;
        this.telegraphDuration = 800; // Será sobrescrito pelo ataque
        this.lastAttackTime = Date.now() + 1000; // Começa a contar após o spawn
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

        if (this.state === 'spawning') {
            this.spawnTimer -= deltaTime;
            if (this.spawnTimer <= 0) {
                this.state = 'idle';
                this.lastAttackTime = Date.now();
            }
        }

        // --- LÓGICA DE MOVIMENTO ---
        if (this.state !== 'attacking' && this.state !== 'spawning') {
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
                // Bater e voltar nas bordas do mapa (com sobra para evitar travar)
                if (this.x > canvasWidth - this.radius - 20) {
                    this.patrolDir = -1;
                } else if (this.x < this.radius + 20) {
                    this.patrolDir = 1;
                }
                const groundY = 200;
                this.y += (groundY - this.y) * 0.05;

            } else if (this.moveType === 'wander') {
                this.moveAngle += (Math.random() - 0.5) * 0.2;
                this.x += Math.cos(this.moveAngle) * this.speed;
                this.y += Math.sin(this.moveAngle * 0.5) * (this.speed * 0.5);

                // Se encostar nas bordas, inverte violentamente o ângulo para o centro
                if (this.x < this.radius + 20 || this.x > canvasWidth - this.radius - 20 ||
                    this.y < this.radius + 20 || this.y > canvasHeight - this.radius - 20) {
                    
                    const centerAngle = Math.atan2((canvasHeight/2) - this.y, (canvasWidth/2) - this.x);
                    this.moveAngle = centerAngle; 
                }
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

            if (dist < player.radius + p.size) {
                hit = true;
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
                // Re-clampar posição para não sair do mapa
                this.x = Math.max(this.radius + 20, Math.min(800 - this.radius - 20, this.x));
                this.y = Math.max(this.radius + 20, Math.min(600 - this.radius - 20, this.y));
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
                // Re-clampar
                this.x = Math.max(this.radius + 20, Math.min(800 - this.radius - 20, this.x));
                this.y = Math.max(this.radius + 20, Math.min(600 - this.radius - 20, this.y));
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
        if (this.state === 'spawning') return; // Boss imortal ao spawnar
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    draw(ctx) {
        if (this.health <= 0) return;

        // --- ANIMAÇÃO DE CORPO (BOB E TILT) ---
        ctx.save();
        
        // Efeito visual de recém-surgido (Piscando)
        if (this.state === 'spawning') {
            ctx.globalAlpha = 0.3 + Math.abs(Math.sin(Date.now() / 150)) * 0.7;
        }

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
                // Manto ondulado (Apprentice)
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius); 
                ctx.lineTo(this.x + this.radius + 10, this.y + this.radius + 15);
                ctx.lineTo(this.x - this.radius - 10, this.y + this.radius + 15); ctx.fill();
                // Detalhe dourado
                ctx.strokeStyle = '#daa520'; ctx.lineWidth = 3; ctx.moveTo(this.x, this.y - this.radius); ctx.lineTo(this.x, this.y + this.radius); ctx.stroke();
                // Capuz
                ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(this.x, this.y - 12, 18, 0, Math.PI * 2); ctx.fill();
                // Olhos
                ctx.fillStyle = this.color; ctx.shadowBlur = 20; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x - 6, this.y - 14, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 6, this.y - 14, 4, 0, Math.PI*2); ctx.fill();
                // Cajado Mágico
                ctx.fillStyle = '#5c4033'; ctx.fillRect(this.x + this.radius + 5, this.y - 30, 4, 60);
                ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x + this.radius + 7, this.y - 35, 8, 0, Math.PI*2); ctx.fill();
                break;

            case 'skeleton':
                // Crânio muito mais detalhado
                ctx.fillStyle = '#e0e0e0';
                ctx.beginPath(); ctx.arc(this.x, this.y - 10, this.radius, 0, Math.PI*2); ctx.fill(); // Topo
                ctx.fillRect(this.x - 15, this.y + this.radius - 12, 30, 20); // Maxilar
                // Dentes
                ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
                for(let i=-10; i<=10; i+=5) { ctx.beginPath(); ctx.moveTo(this.x + i, this.y + this.radius-5); ctx.lineTo(this.x + i, this.y + this.radius + 8); ctx.stroke(); }
                // Olhos
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(this.x - 15, this.y - 15, 12, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 15, this.y - 15, 12, 0, Math.PI*2); ctx.fill();
                // Nariz de caveira
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - 5, this.y + 10); ctx.lineTo(this.x + 5, this.y + 10); ctx.fill();
                // Chamas nos olhos
                ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x - 15, this.y - 15, 5 + Math.random()*2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 15, this.y - 15, 5 + Math.random()*2, 0, Math.PI*2); ctx.fill();
                // Clava de Osso Gigante (Arma)
                ctx.fillStyle = '#dcdcdc'; ctx.beginPath(); ctx.moveTo(this.x + this.radius + 10, this.y + 20); ctx.lineTo(this.x + this.radius + 30, this.y - 40); ctx.lineTo(this.x + this.radius + 40, this.y - 35); ctx.lineTo(this.x + this.radius + 20, this.y + 25); ctx.fill();
                ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(this.x + this.radius + 35, this.y - 30, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x + this.radius + 25, this.y - 35, 6, 0, Math.PI*2); ctx.fill();
                break;

            case 'cultist':
                // Vestes cerimoniais pesadas
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - this.radius, this.y - 20, this.radius * 2, this.radius * 2 + 10);
                // Adornos de ombro
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(this.x - this.radius, this.y - 10, 15, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + this.radius, this.y - 10, 15, 0, Math.PI*2); ctx.fill();
                // Rosto Sombrio
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(this.x, this.y - 25, 20, 0, Math.PI*2); ctx.fill();
                // Chifres Longos e Curvados
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.moveTo(this.x - 15, this.y - 35); ctx.quadraticCurveTo(this.x - 40, this.y - 60, this.x - 10, this.y - 20); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 15, this.y - 35); ctx.quadraticCurveTo(this.x + 40, this.y - 60, this.x + 10, this.y - 20); ctx.fill();
                // Olho flutuante no peito
                ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
                ctx.beginPath(); ctx.arc(this.x, this.y + 10, 8, 0, Math.PI*2); ctx.fill();
                // Adaga Sacrificial Curvada (Arma)
                ctx.shadowBlur = 0; ctx.fillStyle = '#444'; ctx.fillRect(this.x + this.radius + 5, this.y, 6, 15);
                ctx.fillStyle = '#b22222'; ctx.beginPath(); ctx.moveTo(this.x + this.radius + 5, this.y); ctx.quadraticCurveTo(this.x + this.radius + 20, this.y - 20, this.x + this.radius + 10, this.y - 30); ctx.lineTo(this.x + this.radius + 11, this.y); ctx.fill();
                break;

            case 'fallen_knight':
                // Armadura de Placas Pesada
                ctx.fillStyle = '#2a2a2a'; // Metal escuro
                // Tronco
                ctx.fillRect(this.x - this.radius, this.y - this.radius + 15, this.radius * 2, this.radius * 2);
                // Pauldrons (Ombreiras grandes)
                ctx.fillRect(this.x - this.radius - 15, this.y - this.radius + 5, 20, 30);
                ctx.fillRect(this.x + this.radius - 5, this.y - this.radius + 5, 20, 30);
                // Capacete de Cavaleiro
                ctx.fillStyle = '#222';
                ctx.beginPath(); ctx.arc(this.x, this.y - this.radius + 5, 22, Math.PI, 0); ctx.fill();
                ctx.fillRect(this.x - 22, this.y - this.radius + 5, 44, 20);
                // Cruz/Fenda no Rosto
                ctx.fillStyle = '#000';
                ctx.fillRect(this.x - 2, this.y - this.radius, 4, 25); // Fenda Vertical
                ctx.fillRect(this.x - 15, this.y - this.radius + 10, 30, 6); // Fenda Horizontal
                // Brilho demoníaco na fenda horizontal
                ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
                ctx.fillRect(this.x - 10, this.y - this.radius + 11, 20, 4);
                // Capa esfarrapada vermelha
                ctx.fillStyle = '#8b0000'; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(this.x - this.radius, this.y - this.radius + 15); ctx.lineTo(this.x - this.radius - 30, this.y + this.radius + 20); ctx.lineTo(this.x - this.radius + 10, this.y + 10); ctx.fill();
                // Montante Negra Colossal (Arma)
                ctx.fillStyle = '#1a1a1a'; ctx.fillRect(this.x + this.radius + 15, this.y - 10, 5, 30); ctx.fillRect(this.x + this.radius + 5, this.y - 10, 25, 6);
                ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.moveTo(this.x + this.radius + 12, this.y - 10); ctx.lineTo(this.x + this.radius + 12, this.y - 70); ctx.lineTo(this.x + this.radius + 17, this.y - 80); ctx.lineTo(this.x + this.radius + 23, this.y - 70); ctx.lineTo(this.x + this.radius + 23, this.y - 10); ctx.fill();
                ctx.fillStyle = '#8b0000'; ctx.fillRect(this.x + this.radius + 16, this.y - 65, 3, 50);
                break;

            case 'slime':
                // Monstro Gelatinoso Completo
                ctx.fillStyle = this.color;
                ctx.beginPath();
                for (let i = 0; i < 24; i++) {
                    const a = (Math.PI * 2 / 24) * i + this.bobbing;
                    // Raio oscilante imitando gosma mole
                    const r = this.radius + Math.sin(this.bobbing * 15 + i * 4) * 8 + Math.cos(this.bobbing * 8 + i * 2) * 12;
                    const px = this.x + Math.cos(a) * r;
                    const py = this.y + Math.sin(a) * r * 0.8 + 10;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                // Reflexo nojentinho no topo
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.ellipse(this.x - 15, this.y - this.radius/2, 15, 6, -0.2, 0, Math.PI*2); ctx.fill();
                // Olhos descolados e derretidos
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(this.x - 20, this.y + Math.sin(this.bobbing*5)*5, 12, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 25, this.y + 10 + Math.cos(this.bobbing*4)*5, 8, 0, Math.PI*2); ctx.fill();
                // Pupilas
                ctx.fillStyle = '#32cd32';
                ctx.beginPath(); ctx.arc(this.x - 20, this.y + Math.sin(this.bobbing*5)*5, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(this.x + 25, this.y + 10 + Math.cos(this.bobbing*4)*5, 2, 0, Math.PI*2); ctx.fill();
                // Chicote Ácido (Arma)
                {
                    ctx.strokeStyle = '#7fff00'; ctx.lineWidth = 6; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(this.x + this.radius, this.y); const whipBob = Math.sin(this.bobbing * 15) * 20;
                    ctx.quadraticCurveTo(this.x + this.radius + 30, this.y - 40 + whipBob, this.x + this.radius + 60, this.y + whipBob); ctx.stroke();
                    ctx.fillStyle = '#32cd32'; ctx.beginPath(); ctx.arc(this.x + this.radius + 60, this.y + whipBob, 5, 0, Math.PI*2); ctx.fill();
                }
                break;

            case 'assassin':
                // Assassino Tático Encapuzado
                // Corpo Fino e ágil
                ctx.fillStyle = '#12121a';
                ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius - 10); ctx.lineTo(this.x + this.radius, this.y + this.radius); ctx.lineTo(this.x - this.radius, this.y + this.radius); ctx.fill();
                // Lenço no pescoço esvoaçante
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x - this.radius*.7, this.y - 15, this.radius*1.4, Math.sin(this.bobbing * 10) * 5 + 35);
                // Capuz Rente ao Rosto
                ctx.fillStyle = '#0a0a0f'; ctx.beginPath(); ctx.arc(this.x, this.y - 20, 16, 0, Math.PI*2); ctx.fill();
                // Olhos Triangulares Roxos
                ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.moveTo(this.x - 14, this.y - 25); ctx.lineTo(this.x - 2, this.y - 20); ctx.lineTo(this.x - 10, this.y - 18); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 14, this.y - 25); ctx.lineTo(this.x + 2, this.y - 20); ctx.lineTo(this.x + 10, this.y - 18); ctx.fill();
                // Adagas Gêmeas (Arma)
                ctx.fillStyle = '#888';
                ctx.beginPath(); ctx.moveTo(this.x + this.radius, this.y + 10); ctx.lineTo(this.x + this.radius + 15, this.y - 15); ctx.lineTo(this.x + this.radius + 5, this.y + 10); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x - this.radius, this.y + 10); ctx.lineTo(this.x - this.radius - 15, this.y - 15); ctx.lineTo(this.x - this.radius - 5, this.y + 10); ctx.fill();
                break;

            case 'golem':
                // Golem Congelado / Diamante Rígido
                ctx.fillStyle = '#1f456e'; // Cristal profundo
                // Tronco em forma de Losango
                ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius - 30); ctx.lineTo(this.x + this.radius, this.y); ctx.lineTo(this.x, this.y + this.radius + 10); ctx.lineTo(this.x - this.radius, this.y);  ctx.fill();
                // Braços Flutuantes Cristalinos
                ctx.fillStyle = '#4682b4';
                ctx.beginPath(); ctx.moveTo(this.x - this.radius - 10, this.y - 20); ctx.lineTo(this.x - this.radius - 30, this.y); ctx.lineTo(this.x - this.radius - 10, this.y + 20); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + this.radius + 10, this.y - 20); ctx.lineTo(this.x + this.radius + 30, this.y); ctx.lineTo(this.x + this.radius + 10, this.y + 20); ctx.fill();
                // Contornos brilhantes
                ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
                // Núcleo de Vida
                ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 25; ctx.shadowColor = '#00ffff';
                ctx.beginPath(); ctx.moveTo(this.x, this.y - 10); ctx.lineTo(this.x + 10, this.y); ctx.lineTo(this.x, this.y + 10); ctx.lineTo(this.x - 10, this.y); ctx.fill();
                // Lança de Gelo (Arma)
                ctx.shadowBlur = 0; ctx.fillStyle = '#b0e0e6'; ctx.beginPath(); ctx.moveTo(this.x + this.radius + 10, this.y + 30); ctx.lineTo(this.x + this.radius + 15, this.y + 30); ctx.lineTo(this.x + this.radius + 12, this.y - 60); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
                break;

            case 'warlord':
                // Gigante de Lava e Rocha
                // Corpo Pedregoso
                ctx.fillStyle = '#2b1007';
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
                // Placas de rocha no peito
                ctx.fillStyle = '#111';
                ctx.fillRect(this.x - this.radius + 5, this.y - 15, this.radius*2 - 10, 30);
                // Coroa forjada
                ctx.fillStyle = '#542610';
                ctx.beginPath(); ctx.moveTo(this.x - 25, this.y - this.radius + 5); ctx.lineTo(this.x - 30, this.y - this.radius - 20); ctx.lineTo(this.x - 10, this.y - this.radius); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius + 5); ctx.lineTo(this.x, this.y - this.radius - 30); ctx.lineTo(this.x + 10, this.y - this.radius); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 25, this.y - this.radius + 5); ctx.lineTo(this.x + 30, this.y - this.radius - 20); ctx.lineTo(this.x + 10, this.y - this.radius); ctx.fill();
                // Rosto de Fornalha (boca abrindo com magma)
                ctx.fillStyle = '#000'; ctx.fillRect(this.x - 15, this.y - this.radius + 15, 30, 20);
                ctx.fillStyle = '#ff8c00'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff4500';
                ctx.fillRect(this.x - 12, this.y - this.radius + 18, 24, 14); // Magma glow
                // Machado de Batalha de Magma (Arma)
                ctx.shadowBlur = 0; ctx.fillStyle = '#3e2723'; ctx.fillRect(this.x + this.radius + 15, this.y - 30, 8, 80);
                ctx.fillStyle = '#111'; ctx.fillRect(this.x + this.radius + 5, this.y - 20, 28, 15);
                ctx.fillStyle = '#ff4500'; ctx.beginPath(); ctx.moveTo(this.x + this.radius + 30, this.y - 20); ctx.lineTo(this.x + this.radius + 60, this.y - 40); ctx.lineTo(this.x + this.radius + 65, this.y - 12); ctx.lineTo(this.x + this.radius + 60, this.y + 15); ctx.lineTo(this.x + this.radius + 30, this.y - 5); ctx.fill();
                break;

            case 'priestess':
                // Sacerdotisa sem rosto, etérea e fantasmagórica
                // Véu Superior
                ctx.fillStyle = '#220b2e';
                ctx.beginPath(); ctx.arc(this.x, this.y - 25, 18, Math.PI, 0); ctx.fill();
                // Vestido rasgado que dissolve no chão
                ctx.beginPath(); ctx.moveTo(this.x - 18, this.y - 25);
                ctx.lineTo(this.x - this.radius - 5, this.y + this.radius * 1.5);
                // Bordas irregulares do tecido
                for(let i=1; i<=5; i++) {
                    ctx.lineTo(this.x - this.radius - 5 + (this.radius*2.5)*(i/5), this.y + this.radius*1.5 - (i%2)*15);
                }
                ctx.lineTo(this.x + 18, this.y - 25); ctx.fill();
                // Halo Gigante Dourado e Roxo nas costas
                ctx.strokeStyle = '#daa520'; ctx.lineWidth = 4; ctx.shadowBlur = 30; ctx.shadowColor = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y - 25, 35, 0, Math.PI*2); ctx.stroke();
                // O buraco onde deveria estar a face
                ctx.fillStyle = '#000'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(this.x, this.y - 20, 10, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y - 20, 2, 0, Math.PI*2); ctx.fill();
                // Orbe do Vazio (Arma)
                {
                    const orbY = this.y - 20 + Math.sin(Date.now()/200)*10;
                    ctx.fillStyle = '#000'; ctx.shadowBlur = 20; ctx.shadowColor = '#8a2be2';
                    ctx.beginPath(); ctx.arc(this.x + this.radius + 20, orbY, 12, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#9400d3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x + this.radius + 20, orbY, 18, 0, Math.PI*2); ctx.stroke();
                }
                break;

            case 'dragon': {
                // DRAGÃO DETALHADO Gigante
                ctx.fillStyle = '#3d0a0a'; // Vermelho muito escuro
                const bob = Math.sin(this.bobbing*2);
                
                // Cauda grossa
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.quadraticCurveTo(this.x + 80, this.y + 60 + bob*10, this.x + 120, this.y + 40); ctx.lineTo(this.x, this.y+20); ctx.fill();
                
                // Asas de Morcego gigantes acopladas as costas
                ctx.fillStyle = '#200505';
                // Asa Esquerda
                ctx.beginPath(); ctx.moveTo(this.x - 40, this.y - 10);
                ctx.quadraticCurveTo(this.x - 120, this.y - 100 + bob*40, this.x - 180, this.y - 40 + bob*40);
                ctx.quadraticCurveTo(this.x - 100, this.y, this.x - 40, this.y + 40); ctx.fill();
                // Esqueleto da asa esq
                ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.moveTo(this.x - 40, this.y - 10); ctx.lineTo(this.x - 180, this.y - 40 + bob*40); ctx.stroke();
                
                // Asa Direita
                ctx.beginPath(); ctx.moveTo(this.x + 40, this.y - 10);
                ctx.quadraticCurveTo(this.x + 120, this.y - 100 + bob*40, this.x + 180, this.y - 40 + bob*40);
                ctx.quadraticCurveTo(this.x + 100, this.y, this.x + 40, this.y + 40); ctx.fill();
                // Esqueleto asa dir
                ctx.moveTo(this.x + 40, this.y - 10); ctx.lineTo(this.x + 180, this.y - 40 + bob*40); ctx.stroke();

                // Corpo/Peitoral maciço com escamas
                ctx.fillStyle = '#5c1010';
                ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, this.radius, this.radius * 0.8, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#3a0909'; // Sombreamento da barriga
                ctx.beginPath(); ctx.ellipse(this.x, this.y + 25, this.radius * 0.8, this.radius * 0.4, 0, 0, Math.PI*2); ctx.fill();
                
                // Pescoço longo e Cabeça
                ctx.fillStyle = '#5c1010';
                ctx.beginPath(); ctx.moveTo(this.x - 15, this.y); ctx.lineTo(this.x - 20, this.y - 70); ctx.lineTo(this.x + 20, this.y - 70); ctx.lineTo(this.x + 15, this.y); ctx.fill();
                // Chifres principais
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.moveTo(this.x - 15, this.y - 70); ctx.lineTo(this.x - 40, this.y - 100); ctx.lineTo(this.x, this.y - 75); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 15, this.y - 70); ctx.lineTo(this.x + 40, this.y - 100); ctx.lineTo(this.x, this.y - 75); ctx.fill();
                // Cabeça
                ctx.fillStyle = '#4a0c0c';
                ctx.fillRect(this.x - 25, this.y - 80, 50, 40);
                // Focinho Alongado
                ctx.fillStyle = '#5c1010';
                ctx.fillRect(this.x - 15, this.y - 40, 30, 30);
                // Olhos de Fera (Amarelos Brilhantes)
                ctx.fillStyle = '#ffcc00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffcc00';
                ctx.beginPath(); ctx.moveTo(this.x - 22, this.y - 65); ctx.lineTo(this.x - 10, this.y - 60); ctx.lineTo(this.x - 16, this.y - 55); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 22, this.y - 65); ctx.lineTo(this.x + 10, this.y - 60); ctx.lineTo(this.x + 16, this.y - 55); ctx.fill();
                // Garras Flamejantes Gigantes (Armas naturais)
                ctx.fillStyle = '#ff8c00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
                ctx.beginPath(); ctx.moveTo(this.x + 40, this.y + 30); ctx.lineTo(this.x + 70, this.y + 60); ctx.lineTo(this.x + 50, this.y + 30); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x + 50, this.y + 25); ctx.lineTo(this.x + 80, this.y + 45); ctx.lineTo(this.x + 60, this.y + 20); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x - 40, this.y + 30); ctx.lineTo(this.x - 70, this.y + 60); ctx.lineTo(this.x - 50, this.y + 30); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.x - 50, this.y + 25); ctx.lineTo(this.x - 80, this.y + 45); ctx.lineTo(this.x - 60, this.y + 20); ctx.fill();
                break;
            }
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
