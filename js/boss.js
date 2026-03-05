class Boss {
    constructor(name, health, color) {
        this.name = name;
        this.maxHealth = health;
        this.health = health;
        this.color = color || '#ff4d4d';

        this.x = 450;
        this.y = 200;
        this.radius = 40;

        this.isTelegraphing = false;
        this.telegraphTimer = 0;
        this.telegraphDuration = 500; // 500ms from documentation

        this.state = 'idle'; // idle, telegraphing, attacking, moving
        this.lastAttackTime = 0;
        this.attackCooldown = 2000;

        this.projectiles = [];
    }

    update(player, deltaTime, canvasWidth, canvasHeight) {
        if (this.health <= 0) return;

        // Lógica básica de IA: Mover-se levemente em direção ao jogador ou circular
        if (this.state === 'idle') {
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.startTelegraph();
            }
        }

        if (this.state === 'telegraphing') {
            this.telegraphTimer += deltaTime;
            if (this.telegraphTimer >= this.telegraphDuration) {
                this.performAttack(player);
            }
        }

        // Atualizar projéteis
        this.projectiles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;

            // Colisão com o jogador
            const dx = p.x - player.x;
            const dy = p.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < player.radius + p.radius) {
                player.takeDamage(10);
                this.projectiles.splice(index, 1);
            }

            // Remover projéteis fora da tela
            if (p.x < 0 || p.x > canvasWidth || p.y < 0 || p.y > canvasHeight) {
                this.projectiles.splice(index, 1);
            }
        });
    }

    startTelegraph() {
        this.state = 'telegraphing';
        this.telegraphTimer = 0;
    }

    performAttack(player) {
        this.state = 'attacking';

        // Exemplo de ataque: Disparar projétil em direção ao jogador
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            radius: 8
        });

        this.lastAttackTime = Date.now();

        setTimeout(() => {
            if (this.health > 0) this.state = 'idle';
        }, 300);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    draw(ctx) {
        if (this.health <= 0) return;

        // Desenhar projéteis
        ctx.fillStyle = this.color;
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();

        // Efeito de brilho se estiver telegrafando
        if (this.state === 'telegraphing') {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#fff';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Corpo do Boss
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Barra de HP do Boss
        this.drawHealthBar(ctx);

        ctx.restore();
    }

    drawHealthBar(ctx) {
        const width = 200;
        const height = 10;
        const x = this.x - width / 2;
        const y = this.y - this.radius - 30;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, width * (this.health / this.maxHealth), height);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, y - 5);
    }
}
