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
        if (theme === 'alien') return 'patrol'; // Aliens agora patrulham andando
        if (theme === 'barbarian') return 'chase'; // Bárbaros perseguem andando
        return 'wander'; // Mutantes andam erraticamente
    }

    getSpeedByTheme(theme) {
        if (theme === 'barbarian') return 2.8;
        if (theme === 'alien') return 3.2;
        return 2.5;
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
            const dy = (player.y - 150) - this.y;
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
        if (this.theme === 'alien') return ['laser', 'directed'];
        if (this.theme === 'barbarian') return ['wave', 'directed'];
        return ['sludge', 'directed'];
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
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.state === 'telegraphing') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.theme === 'alien') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius / 2);
            ctx.lineTo(this.x - this.radius, this.y + this.radius / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(this.x, this.y - 15, 15, 0, Math.PI * 2); ctx.fill();
        } else if (this.theme === 'barbarian') {
            ctx.fillRect(this.x - this.radius, this.y - this.radius / 2, this.radius * 2, this.radius);
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x - 20, this.y - 10, 40, 5);
        } else if (this.theme === 'mutant') {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i + this.bobbing;
                const r = this.radius + Math.sin(this.bobbing * 5 + i) * 10;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI * 2); ctx.fill();
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
