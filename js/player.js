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

            // ===== ESPADA LONGA MEDIEVAL =====
            ctx.shadowBlur = 0;

            // Pomo (Pommel) - Esfera de ferro
            ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.arc(3, 0, 4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
            ctx.stroke();

            // Empunhadura (Grip) - Couro marrom enrolado
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(6, -3, 16, 6);
            // Tiras de couro
            ctx.strokeStyle = '#2a1a0e';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(8 + i * 4, -3);
                ctx.lineTo(8 + i * 4, 3);
                ctx.stroke();
            }

            // Guarda (Crossguard) - Ferro simples, fino
            ctx.fillStyle = '#666';
            ctx.fillRect(21, -12, 4, 24);
            // Pontas da guarda levemente arredondadas
            ctx.beginPath(); ctx.arc(23, -12, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(23, 12, 2, 0, Math.PI * 2); ctx.fill();

            // Lâmina reta e longa (Longsword)
            // Fio primário - aço cinza
            const bladeGrad = ctx.createLinearGradient(25, -4, 25, 4);
            bladeGrad.addColorStop(0, '#a8a8a8');
            bladeGrad.addColorStop(0.3, '#d0d0d0');
            bladeGrad.addColorStop(0.5, '#e0e0e0');
            bladeGrad.addColorStop(0.7, '#d0d0d0');
            bladeGrad.addColorStop(1, '#a8a8a8');
            ctx.fillStyle = bladeGrad;
            ctx.beginPath();
            ctx.moveTo(25, -4);     // Base superior
            ctx.lineTo(90, -3);     // Lâmina reta superior
            ctx.lineTo(100, 0);     // Ponta
            ctx.lineTo(90, 3);      // Lâmina reta inferior
            ctx.lineTo(25, 4);      // Base inferior
            ctx.closePath();
            ctx.fill();

            // Borda da lâmina (contorno fino)
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Sangueira (Fuller) - sulco central da lâmina
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(28, 0);
            ctx.lineTo(82, 0);
            ctx.stroke();

            // Efeito de corte (arco sutil, NÃO neon)
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.25)';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, 85, -0.6, 0.6);
            ctx.stroke();

        } else if (this.attackType === 'bow') {
            // ===== ARCO LONGO DE MADEIRA =====
            ctx.shadowBlur = 0;

            // Corpo do Arco (Madeira escura - teixo/yew)
            const bowGrad = ctx.createLinearGradient(10, -40, 10, 40);
            bowGrad.addColorStop(0, '#4a3728');
            bowGrad.addColorStop(0.3, '#6d4c3d');
            bowGrad.addColorStop(0.5, '#7b5b4a');
            bowGrad.addColorStop(0.7, '#6d4c3d');
            bowGrad.addColorStop(1, '#4a3728');
            ctx.strokeStyle = bowGrad;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(12, 0, 36, -Math.PI / 1.7, Math.PI / 1.7);
            ctx.stroke();

            // Textura da madeira (veios)
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(12, 0, 34, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            // Pontas do arco (nocks - entalhes para a corda)
            const topX = 12 + Math.cos(-Math.PI / 1.7) * 36;
            const topY = Math.sin(-Math.PI / 1.7) * 36;
            const botX = 12 + Math.cos(Math.PI / 1.7) * 36;
            const botY = Math.sin(Math.PI / 1.7) * 36;
            ctx.fillStyle = '#3e2723';
            ctx.beginPath(); ctx.arc(topX, topY, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(botX, botY, 3, 0, Math.PI * 2); ctx.fill();

            // Corda (Linho/cânhamo - cor natural)
            ctx.strokeStyle = '#c4b59d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(-8, 0); // Ponto puxado
            ctx.lineTo(botX, botY);
            ctx.stroke();

            // Flecha posicionada no arco
            // Haste (madeira clara)
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(-8, -1, 42, 2);

            // Ponta de ferro (triangular)
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(34, -3); ctx.lineTo(42, 0); ctx.lineTo(34, 3);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Penas (Fletching) - penas de ganso, cores naturais
            ctx.fillStyle = '#ddd';
            ctx.beginPath();
            ctx.moveTo(-8, -1); ctx.lineTo(-14, -5); ctx.lineTo(-4, -1); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-8, 1); ctx.lineTo(-14, 5); ctx.lineTo(-4, 1); ctx.fill();
            // Pena central
            ctx.fillStyle = '#bbb';
            ctx.beginPath();
            ctx.moveTo(-6, -1); ctx.lineTo(-10, -3); ctx.lineTo(-3, -1); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-6, 1); ctx.lineTo(-10, 3); ctx.lineTo(-3, 1); ctx.fill();
        }

        ctx.restore();
    }
}
