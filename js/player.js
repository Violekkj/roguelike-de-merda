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

        // Movimentação
        if (!this.isDashing) {
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
                
                this.x += this.direction.x * this.speed;
                this.y += this.direction.y * this.speed;
            }
        } else {
            // Durante o Dash
            this.x += this.direction.x * this.dashSpeed;
            this.y += this.direction.y * this.dashSpeed;
        }

        // Colisões com as bordas
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        // Dash Logic
        if ((keys[' '] || keys['Shift']) && this.canDash && (this.direction.x !== 0 || this.direction.y !== 0)) {
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

    draw(ctx) {
        ctx.save();
        
        // Efeito de trail se estiver dando dash
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(124, 77, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x - this.direction.x * 10, this.y - this.direction.y * 10, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corpo do jogador
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#7c4dff';
        ctx.fillStyle = this.isInvincible ? '#fff' : '#7c4dff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos/Indicação de direção
        ctx.fillStyle = '#000';
        const eyeX = this.x + this.direction.x * 8;
        const eyeY = this.y + this.direction.y * 8;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
