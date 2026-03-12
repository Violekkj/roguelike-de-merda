class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.baseSpeed = 4;
        this.speed = this.baseSpeed;

        this.maxHealth = 100;
        this.health = 100;

        this.maxMana = 100;
        this.mana = 100;
        this.manaRegen = 0.5;
        this.bowCost = 20;

        this.isDashing = false;
        this.dashSpeed = 15;
        this.dashDuration = 150; // ms
        this.dashCooldown = 1200;
        this.canDash = true;
        this.lastDashTime = 0;
        this.dashDirection = { x: 0, y: 0 }; // Direção fixa do dash

        this.isInvincible = false;
        this.invincibilityDuration = 200;

        this.isAttacking = false;
        this.attackType = null;
        this.swordCooldownTimer = 0; // Cooldown da espada em ms
        this.swordCooldownMax = 500;  // 500ms entre ataques de espada
        this.bowCooldownTimer = 0;
        this.bowCooldownMax = 450;

        // Animação da espada
        this.swordSwingAngle = 0;
        this.swordSwingDir = 1;

        this.direction = { x: 0, y: 0 };
    }

    update(keys, mouse, deltaTime, canvasWidth, canvasHeight) {
        // Regenerar Mana
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + this.manaRegen);
        }

        // Cooldowns de ataque
        if (this.swordCooldownTimer > 0) this.swordCooldownTimer -= deltaTime;
        if (this.bowCooldownTimer > 0) this.bowCooldownTimer -= deltaTime;

        // Atualizar direção baseada no movimento (WASD)
        let dx = 0;
        let dy = 0;
        if (keys['w'] || keys['W']) dy -= 1;
        if (keys['s'] || keys['S']) dy += 1;
        if (keys['a'] || keys['A']) dx -= 1;
        if (keys['d'] || keys['D']) dx += 1;

        // Movimentação
        if (!this.isDashing) {
            if (dx !== 0 || dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                this.direction.x = dx / length;
                this.direction.y = dy / length;
                this.x += this.direction.x * this.speed;
                this.y += this.direction.y * this.speed;
            }
        } else {
            // Durante o dash, usa a direção que foi fixada no startDash
            this.x += this.dashDirection.x * this.dashSpeed;
            this.y += this.dashDirection.y * this.dashSpeed;
        }

        // Direção do Mouse (para mira)
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        // Colisões com as bordas
        const wallMargin = 30;
        this.x = Math.max(wallMargin, Math.min(canvasWidth - wallMargin, this.x));
        this.y = Math.max(wallMargin, Math.min(canvasHeight - wallMargin, this.y));

        // Dash Logic
        let dashCost = 30;
        if (this.dashDiscount) dashCost = Math.max(5, Math.floor(dashCost * (1 - this.dashDiscount)));
        if ((keys[' '] || keys['Shift']) && this.canDash && this.mana >= dashCost && (dx !== 0 || dy !== 0)) {
            this.mana -= dashCost;
            // Fixa a direção do dash no momento que o jogador aperta
            const length = Math.sqrt(dx * dx + dy * dy);
            this.dashDirection.x = dx / length;
            this.dashDirection.y = dy / length;
            this.startDash();
        }

        // Animação do swing da espada
        if (this.isAttacking && this.attackType === 'sword') {
            this.swordSwingAngle += 0.35 * this.swordSwingDir;
        } else {
            this.swordSwingAngle = 0;
        }

        // Atualizar UI Bars
        this.updateUI();
    }

    startDash() {
        this.isDashing = true;
        this.canDash = false;
        this.isInvincible = true;
        this.lastDashTime = Date.now();
        if (typeof playSound === 'function') playSound('dash');

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

        setTimeout(() => {
            this.isInvincible = false;
        }, this.invincibilityDuration);
    }

    updateUI() {
        const hpBar = document.getElementById('player-hp-bar');
        const manaBar = document.getElementById('player-mana-bar');

        if (hpBar) hpBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
        if (manaBar) manaBar.style.width = `${(this.mana / this.maxMana) * 100}%`;
    }

    draw(ctx, mouse) {
        ctx.save();

        // Efeito de trail se estiver dando dash (poeira/sombra)
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(50, 40, 30, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x - this.dashDirection.x * 12, this.y - this.dashDirection.y * 12, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x - this.dashDirection.x * 24, this.y - this.dashDirection.y * 24, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Desenhar Arma se estiver atacando
        if (this.isAttacking) {
            this.drawWeapon(ctx);
        }

        // --- DESIGN DE CAVALEIRO MEDIEVAL ---
        ctx.shadowBlur = this.isInvincible ? 15 : 5;
        ctx.shadowColor = this.isInvincible ? '#fff' : '#000';

        // Capa esvoaçante (Vermelho escuro)
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        const capeAngle = this.angle + Math.PI;
        ctx.arc(this.x + Math.cos(capeAngle) * 5, this.y + Math.sin(capeAngle) * 5, this.radius + 2, capeAngle - 1, capeAngle + 1);
        ctx.fill();

        // Corpo Base (Cota de Malha)
        ctx.fillStyle = '#404040';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Placas de Armadura Peitoral
        ctx.fillStyle = '#8c8c8c';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ombreiras
        ctx.fillStyle = '#a0a0a0';
        const shoulderAngle = this.angle + Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(this.x + Math.cos(shoulderAngle) * 16, this.y + Math.sin(shoulderAngle) * 16, 9, 14, shoulderAngle, 0, Math.PI * 2);
        ctx.ellipse(this.x - Math.cos(shoulderAngle) * 16, this.y - Math.sin(shoulderAngle) * 16, 9, 14, shoulderAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Capacete
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = '#737373';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Fenda do Elmo
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(4, -5, 8, 10);
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(6, -2, 2, 4);
        
        ctx.restore();

        ctx.restore();
    }

    drawWeapon(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.attackType === 'sword') {
            // Rotação do swing animado
            ctx.rotate(this.swordSwingAngle);

            // ===== ESPADA FLAMEJANTE MEDIEVAL =====
            // Brilho épico da lâmina
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff6600';

            // Empunhadura (Couro trabalhado)
            ctx.fillStyle = '#2d1b10';
            ctx.fillRect(5, -4, 18, 8);
            // Faixas de couro
            ctx.fillStyle = '#1a0f08';
            ctx.fillRect(8, -4, 3, 8);
            ctx.fillRect(15, -4, 3, 8);
            // Pomo ornamental
            ctx.fillStyle = '#d4af37';
            ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8b0000';
            ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI * 2); ctx.fill();

            // Guarda (Crossguard) - Ouro e ferro
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(22, -18, 5, 36);
            // Detalhes na guarda
            ctx.fillStyle = '#b8860b';
            ctx.beginPath();
            ctx.moveTo(22, -18); ctx.lineTo(18, -22); ctx.lineTo(27, -18); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(22, 18); ctx.lineTo(18, 22); ctx.lineTo(27, 18); ctx.fill();

            // Lâmina principal (Aço polido com gradiente)
            const bladeGrad = ctx.createLinearGradient(27, 0, 100, 0);
            bladeGrad.addColorStop(0, '#c0c0c0');
            bladeGrad.addColorStop(0.5, '#e8e8e8');
            bladeGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = bladeGrad;
            ctx.beginPath();
            ctx.moveTo(27, -6);
            ctx.lineTo(85, -4);
            ctx.lineTo(100, 0); // Ponta afiada
            ctx.lineTo(85, 4);
            ctx.lineTo(27, 6);
            ctx.closePath();
            ctx.fill();

            // Fio de corte central (Sangueira/Fuller brilhante)
            ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
            ctx.beginPath();
            ctx.moveTo(30, -1.5);
            ctx.lineTo(80, 0);
            ctx.lineTo(30, 1.5);
            ctx.fill();

            // Borda cortante luminosa

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(27, -6); ctx.lineTo(100, 0); ctx.lineTo(27, 6);
            ctx.stroke();

            // ===== EFEITO DE CORTE (Arco de vento) =====
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 200, 100, 0.6)';
            ctx.strokeStyle = 'rgba(255, 220, 150, 0.5)';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, 90, -0.8, 0.8);
            ctx.stroke();

            // Trail de partículas do corte
            ctx.strokeStyle = 'rgba(255, 150, 50, 0.3)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, 95, -0.5, 0.5);
            ctx.stroke();

        } else if (this.attackType === 'bow') {
            // ===== ARCO ÉLFICO ORNAMENTAL =====
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#4dffb5';

            // Corpo do Arco (Madeira dourada entalhada)
            const bowGrad = ctx.createLinearGradient(10, -40, 10, 40);
            bowGrad.addColorStop(0, '#8B6914');
            bowGrad.addColorStop(0.5, '#DAA520');
            bowGrad.addColorStop(1, '#8B6914');
            ctx.strokeStyle = bowGrad;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(12, 0, 38, -Math.PI / 1.6, Math.PI / 1.6);
            ctx.stroke();

            // Detalhes gravados no arco (linhas decorativas)
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(12, 0, 35, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(12, 0, 41, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            // Pontas do arco (ornamentos dourados)
            const topX = 12 + Math.cos(-Math.PI / 1.6) * 38;
            const topY = Math.sin(-Math.PI / 1.6) * 38;
            const botX = 12 + Math.cos(Math.PI / 1.6) * 38;
            const botY = Math.sin(Math.PI / 1.6) * 38;
            ctx.fillStyle = '#d4af37';
            ctx.beginPath(); ctx.arc(topX, topY, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(botX, botY, 4, 0, Math.PI * 2); ctx.fill();

            // Corda sendo puxada (brilho mágico)
            ctx.strokeStyle = '#4dffb5';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#4dffb5';
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(-10, 0); // Ponto de puxada profunda
            ctx.lineTo(botX, botY);
            ctx.stroke();

            // Flecha posicionada (Premium)
            // Haste de madeira com gradiente
            const arrowGrad = ctx.createLinearGradient(-10, 0, 35, 0);
            arrowGrad.addColorStop(0, '#5d4037');
            arrowGrad.addColorStop(1, '#8d6e63');
            ctx.fillStyle = arrowGrad;
            ctx.fillRect(-10, -1.5, 45, 3);

            // Ponta de aço brilhante
            ctx.fillStyle = '#e0e0e0';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.moveTo(35, -4); ctx.lineTo(45, 0); ctx.lineTo(35, 4);
            ctx.fill();

            // Penas (Fletching) com cor
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.moveTo(-10, -1.5); ctx.lineTo(-16, -6); ctx.lineTo(-6, -1.5); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-10, 1.5); ctx.lineTo(-16, 6); ctx.lineTo(-6, 1.5); ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(-8, -1.5); ctx.lineTo(-12, -4); ctx.lineTo(-4, -1.5); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-8, 1.5); ctx.lineTo(-12, 4); ctx.lineTo(-4, 1.5); ctx.fill();

            // Aura de energia ao redor da flecha
            ctx.strokeStyle = 'rgba(77, 255, 181, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-5, 0); ctx.lineTo(40, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}
