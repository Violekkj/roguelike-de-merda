class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.baseSpeed = 4;
        this.speed = this.baseSpeed;

        this.maxHealth = 100;
        this.health = 100;

        this.maxStamina = 100;
        this.stamina = 100;
        this.staminaRegen = 0.5;
        this.bowCost = 20;

        this.isDashing = false;
        this.dashSpeed = 15;
        this.dashDuration = 150; // ms
        this.dashCooldown = 1200; // 1.2s from documentation
        this.canDash = true;
        this.lastDashTime = 0;

        this.isInvincible = false;
        this.invincibilityDuration = 200;

        this.attackCooldown = 0;
        this.isAttacking = false;

        this.direction = { x: 0, y: 0 };
    }

    update(keys, mouse, deltaTime, canvasWidth, canvasHeight) {
        // Regênerar Stamina
        if (this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
        }

        // Atualizar direção baseada no movimento (WASD)
        let dx = 0;
        let dy = 0;
        if (keys['w'] || keys['W']) dy -= 1;
        if (keys['s'] || keys['S']) dy += 1;
        if (keys['a'] || keys['A']) dx -= 1;
        if (keys['d'] || keys['D']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            this.direction.x = dx / length;
            this.direction.y = dy / length;
        }

        // Movimentação
        if (!this.isDashing) {
            if (dx !== 0 || dy !== 0) {
                this.x += this.direction.x * this.speed;
                this.y += this.direction.y * this.speed;
            }
        } else {
            this.x += this.direction.x * this.dashSpeed;
            this.y += this.direction.y * this.dashSpeed;
        }

        // Direção do Mouse (para mira)
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        // Colisões com as bordas
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        // Dash Logic
        if ((keys[' '] || keys['Shift']) && this.canDash && (dx !== 0 || dy !== 0)) {
            this.startDash();
        }

        // Atualizar UI Bars
        this.updateUI();
    }

    startDash() {
        this.isDashing = true;
        this.canDash = false;
        this.isInvincible = true;
        this.lastDashTime = Date.now();

        setTimeout(() => {
            this.isDashing = false;
            this.isInvincible = false;
        }, this.dashDuration);

        setTimeout(() => {
            this.canDash = true;
        }, this.dashCooldown);
    }

    takeDamage(amount) {
        if (this.isInvincible) return;

        this.health -= amount;
        this.isInvincible = true;

        // Pequeno flash de invencibilidade após tomar dano
        setTimeout(() => {
            this.isInvincible = false;
        }, this.invincibilityDuration);
    }

    updateUI() {
        const hpBar = document.getElementById('player-hp-bar');
        const staminaBar = document.getElementById('player-stamina-bar');

        if (hpBar) hpBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
        if (staminaBar) staminaBar.style.width = `${(this.stamina / this.maxStamina) * 100}%`;
    }

    draw(ctx, mouse) {
        ctx.save();

        // Efeito de trail se estiver dando dash
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(124, 77, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x - this.direction.x * 10, this.y - this.direction.y * 10, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Desenhar Arma se estiver atacando
        if (this.isAttacking) {
            this.drawWeapon(ctx);
        }

        // --- DESIGN DE ARMADURA DO PROTAGONISTA ---
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.isInvincible ? '#fff' : '#7c4dff';

        // Corpo Base (Armadura Peitoral)
        ctx.fillStyle = '#2a2a3a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Placas de Armadura (Visual de Roguelike Tech)
        ctx.strokeStyle = '#7c4dff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 4, 0, Math.PI * 2);
        ctx.stroke();

        // Ombreiras
        ctx.fillStyle = '#3f3f5f';
        const shoulderAngle = this.angle + Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(this.x + Math.cos(shoulderAngle) * 15, this.y + Math.sin(shoulderAngle) * 15, 8, 12, shoulderAngle, 0, Math.PI * 2);
        ctx.ellipse(this.x - Math.cos(shoulderAngle) * 15, this.y - Math.sin(shoulderAngle) * 15, 8, 12, shoulderAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Capacete / Visor Neon
        ctx.fillStyle = '#7c4dff';
        ctx.shadowBlur = 10;
        const visorWidth = 14;
        const visorHeight = 4;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillRect(5, -visorHeight / 2, visorWidth, visorHeight); // Visor frontal
        ctx.restore();

        ctx.restore();
    }

    drawWeapon(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.attackType === 'sword') {
            // Desenho de uma Espada Real
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';

            // Empunhadura (Hilt)
            ctx.fillStyle = '#4a2c1d'; // Madeira/Couro
            ctx.fillRect(5, -3, 15, 6);

            // Guarda da mão (Crossguard)
            ctx.fillStyle = '#ffd700'; // Dourado
            ctx.fillRect(18, -12, 5, 24);

            // Lâmina (Blade)
            ctx.fillStyle = '#e0e0e0'; // Metal
            ctx.beginPath();
            ctx.moveTo(23, -6);
            ctx.lineTo(80, -2);
            ctx.lineTo(85, 0); // Ponta
            ctx.lineTo(80, 2);
            ctx.lineTo(23, 6);
            ctx.closePath();
            ctx.fill();

            // Brilho no centro da lâmina
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(75, 0);
            ctx.stroke();

            // Efeito de movimento (Slash Arc)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 8;
            ctx.arc(0, 0, 70, -0.6, 0.6);
            ctx.stroke();

        } else if (this.attackType === 'bow') {
            // Desenho de um Arco Detalhado
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#4dffb5';

            // Corpo do arco (Estrutura curva)
            ctx.strokeStyle = '#1a4a35'; // Base escura
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(10, 0, 30, -Math.PI / 1.8, Math.PI / 1.8);
            ctx.stroke();

            ctx.strokeStyle = '#4dffb5'; // Brilho neon
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(10, 0, 30, -Math.PI / 1.8, Math.PI / 1.8);
            ctx.stroke();

            // Extremidades reforçadas
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(10 + Math.cos(-Math.PI / 1.8) * 30, Math.sin(-Math.PI / 1.8) * 30, 4, 0, Math.PI * 2);
            ctx.arc(10 + Math.cos(Math.PI / 1.8) * 30, Math.sin(Math.PI / 1.8) * 30, 4, 0, Math.PI * 2);
            ctx.fill();

            // Corda sendo puxada
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10 + Math.cos(-Math.PI / 1.8) * 30, Math.sin(-Math.PI / 1.8) * 30);
            ctx.lineTo(-5, 0); // Ponto de puxada
            ctx.lineTo(10 + Math.cos(Math.PI / 1.8) * 30, Math.sin(Math.PI / 1.8) * 30);
            ctx.stroke();
        }

        ctx.restore();
    }
}
