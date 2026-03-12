class Boss {
    constructor(name, health, color, theme = 'alien') {
        this.name = name;
        this.maxHealth = health;
        this.health = health;
        this.color = color || '#ff4d4d';
        this.theme = theme; // alien, barbarian, mutant

        this.x = 450;
        this.y = 200;
        this.radius = 50;

        this.state = 'idle';
        this.telegraphTimer = 0;
        this.telegraphDuration = 800;
        this.lastAttackTime = 0;
        this.attackCooldown = 1800;

        this.projectiles = [];
        this.moveAngle = 0;

        // --- SISTEMA DE MOVIMENTAÇÃO VARIADA ---
        this.moveType = this.getMoveTypeByTheme(theme);
        this.vx = 0;
        this.vy = 0;
        this.speed = this.getSpeedByTheme(theme);
        this.targetPos = { x: 450, y: 200 };
        this.lastTeleport = 0;

        // Animação
        this.scalePulse = 1;
        this.bobbing = 0;
    }

    getMoveTypeByTheme(theme) {
        if (theme === 'warlock') return 'wander'; // Bruxos andam lentamente pela arena
        if (theme === 'knight') return 'chase'; // Cavaleiros perseguem andando
        return 'patrol'; // Bestas patrulham erráticas
    }

    getSpeedByTheme(theme) {
        if (theme === 'knight') return 2.6;
        if (theme === 'beast') return 3.4;
        return 2.0; // warlock é mais lento
    }

    update(player, deltaTime, canvasWidth, canvasHeight) {
        if (this.health <= 0) return;

        // --- ANIMAÇÃO DE CAMINHADA ---
        this.stepPhase = (this.stepPhase || 0) + 0.15;
        this.walkBob = Math.abs(Math.sin(this.stepPhase)) * 8; // Pulo do passo
        this.walkTilt = Math.sin(this.stepPhase) * 0.1; // Inclinação lateral

        // --- LÓGICA DE MOVIMENTO (ANDANDO) ---
        if (this.moveType === 'chase') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        } else if (this.moveType === 'patrol') {
            if (!this.patrolDir) this.patrolDir = 1;
            this.x += this.patrolDir * this.speed;
            if (this.x > canvasWidth - 150 || this.x < 150) {
                this.patrolDir *= -1;
            }
            // Manter no "chão" da arena
            const groundY = 200;
            this.y += (groundY - this.y) * 0.05;
        } else if (this.moveType === 'wander') {
            this.moveAngle += 0.02;
            this.x += Math.cos(this.moveAngle) * this.speed;
            this.y += Math.sin(this.moveAngle * 0.5) * (this.speed * 0.5);
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
        const patterns = this.getPatternsByTheme();
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        if (pattern === 'laser') this.shootLaser(player);
        else if (pattern === 'wave') this.shootSwordWave(player);
        else if (pattern === 'sludge') this.shootSludgeLine(player);
        else this.shootAtPlayer(player, 5);

        this.lastAttackTime = Date.now();
        setTimeout(() => { if (this.health > 0) this.state = 'idle'; }, 600);
    }

    getPatternsByTheme() {
        if (this.theme === 'warlock') return ['laser', 'directed']; // Fireballs / Dark magic
        if (this.theme === 'knight') return ['wave', 'directed']; // Sword waves
        return ['sludge', 'directed']; // Beast spit / leaps
    }

    shootLaser(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 20; i++) {
            this.projectiles.push({
                x: this.x + Math.cos(angle) * i * 30,
                y: this.y + Math.sin(angle) * i * 30,
                vx: 0, vy: 0, radius: 15, type: 'laser'
            });
        }
        setTimeout(() => { this.projectiles = this.projectiles.filter(p => p.type !== 'laser'); }, 800);
    }

    shootSwordWave(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
            angle: angle, type: 'line', width: 100, height: 15
        });
    }

    shootSludgeLine(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.projectiles.push({
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * (4 + i), vy: Math.sin(angle) * (4 + i),
                    radius: 12, type: 'blob'
                });
            }, i * 150);
        }
    }

    shootAtPlayer(player, speed) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            radius: 10, type: 'blob'
        });
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
            ctx.shadowBlur = 15; ctx.shadowColor = this.color;
            ctx.fillStyle = (p.type === 'laser') ? '#fff' : this.color;
            if (p.type === 'line') {
                ctx.translate(p.x, p.y); ctx.rotate(p.angle);
                ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
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
        ctx.shadowColor = '#000'; // Sombra mais sombria
        ctx.fillStyle = this.color;

        if (this.state === 'telegraphing') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            
            // Círculo mágico de ataque (Se for Warlock)
            if (this.theme === 'warlock') {
                ctx.strokeStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 30, this.telegraphTimer/100, Math.PI + this.telegraphTimer/100);
                ctx.stroke();
            }
        }

        if (this.theme === 'warlock') {
            // Manto de Bruxo (Triângulo com capuz)
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius + 10);
            ctx.lineTo(this.x - this.radius, this.y + this.radius + 10);
            ctx.closePath();
            ctx.fill();
            
            // Fenda escura no capuz e olhos mágicos
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath(); ctx.arc(this.x, this.y - 10, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = this.color; // Olhos da cor do bruxo
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath(); ctx.arc(this.x - 5, this.y - 12, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 5, this.y - 12, 3, 0, Math.PI * 2); ctx.fill();
            
        } else if (this.theme === 'knight') {
            // Armadura Pesada Quadrada (Cavaleiro Negro)
            ctx.fillStyle = '#303030';
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            ctx.fillStyle = this.color; // Detalhe da capa/penacho
            ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, this.radius * 2, 15);
            
            // Fenda do elmo do boss
            ctx.fillStyle = '#111';
            ctx.fillRect(this.x - 25, this.y - 15, 50, 8);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - 5, this.y - 14, 10, 6);
            
        } else if (this.theme === 'beast') {
            // Besta Feroz (Forma peluda/espetada irregular)
            ctx.fillStyle = '#4a3020'; // Marrom/Escuro
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const a = (Math.PI * 2 / 12) * i + this.bobbing;
                const r = this.radius + Math.sin(this.bobbing * 5 + i * 2) * 15;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            
            // Olhos e listras da fera
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x - 15, this.y - 5, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 15, this.y - 5, 5, 0, Math.PI*2); ctx.fill();
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
