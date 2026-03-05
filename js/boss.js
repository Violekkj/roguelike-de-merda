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
        this.telegraphDuration = 800; // Maior para ataques de linha
        this.lastAttackTime = 0;
        this.attackCooldown = 1800;

        this.projectiles = []; // Podem ser bolas ou segmentos de linha
        this.moveAngle = 0;
    }

    update(player, deltaTime, canvasWidth, canvasHeight) {
        if (this.health <= 0) return;

        // Movimentação
        this.moveAngle += 0.02;
        this.x += Math.cos(this.moveAngle) * 2;

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

        // Atualizar projéteis/ataques
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Colisão (Suporta círculos e linhas/retângulos)
            let hit = false;
            if (p.type === 'line') {
                // Colisão de retângulo girado simplificada
                const dx = player.x - p.x;
                const dy = player.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.radius + 15) hit = true;
            } else {
                const dx = p.x - player.x;
                const dy = p.y - player.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.radius + p.radius) hit = true;
            }

            if (hit) {
                player.takeDamage(15);
                if (p.type !== 'laser') this.projectiles.splice(i, 1);
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

        if (pattern === 'laser') {
            this.shootLaser(player);
        } else if (pattern === 'wave') {
            this.shootSwordWave(player);
        } else if (pattern === 'sludge') {
            this.shootSludgeLine(player);
        } else {
            this.shootAtPlayer(player, 6); // Fallback
        }

        this.lastAttackTime = Date.now();
        setTimeout(() => { if (this.health > 0) this.state = 'idle'; }, 600);
    }

    getPatternsByTheme() {
        if (this.theme === 'alien') return ['laser', 'directed'];
        if (this.theme === 'barbarian') return ['wave', 'directed'];
        if (this.theme === 'mutant') return ['sludge', 'directed'];
        return ['directed'];
    }

    shootLaser(player) {
        // Ataque de linha larga (Laser Alien)
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 20; i++) {
            this.projectiles.push({
                x: this.x + Math.cos(angle) * i * 30,
                y: this.y + Math.sin(angle) * i * 30,
                vx: 0, vy: 0, radius: 15, type: 'laser', life: 20
            });
        }
        // Remover lasers rapinamente
        setTimeout(() => { this.projectiles = this.projectiles.filter(p => p.type !== 'laser'); }, 500);
    }

    shootSwordWave(player) {
        // Ataque de linha/arco (Onda de Machado Bárbaro)
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            angle: angle, type: 'line', width: 80, height: 10
        });
    }

    shootSludgeLine(player) {
        // Linha de lama/veneno (Mutante)
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.projectiles.push({
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * (5 + i), vy: Math.sin(angle) * (5 + i),
                    radius: 12, type: 'blob'
                });
            }, i * 100);
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

        // Desenhar Ataques
        this.projectiles.forEach(p => {
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            if (p.type === 'line') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
            } else if (p.type === 'laser') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        this.drawThemedBody(ctx);
        this.drawHealthBar(ctx);
    }

    drawThemedBody(ctx) {
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.state === 'telegraphing') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (this.theme === 'alien') {
            // Visual de Nave/Alien Tripé
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius / 2);
            ctx.lineTo(this.x - this.radius, this.y + this.radius / 2);
            ctx.closePath();
            ctx.fill();
            // Cúpula
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 10, 20, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.theme === 'barbarian') {
            // Visual Robusto/Bárbaro com Machados
            ctx.fillRect(this.x - this.radius, this.y - this.radius / 2, this.radius * 2, this.radius);
            ctx.fillStyle = '#aa0000';
            ctx.fillRect(this.x - 10, this.y - this.radius, 20, this.radius); // Elmo
        } else if (this.theme === 'mutant') {
            // Visual Amorfo/Mutante
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i + this.moveAngle;
                const r = this.radius + Math.sin(this.moveAngle * 5 + i) * 15;
                const px = this.x + Math.cos(a) * r;
                const py = this.y + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Olho
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
        ctx.roundRect(x, y, width, height, 8);
        ctx.fill();
        const hpW = (this.health / this.maxHealth) * width;
        if (hpW > 0) {
            ctx.fillStyle = this.color;
            ctx.roundRect(x, y, hpW, height, 8);
            ctx.fill();
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, y - 10);
    }
}
