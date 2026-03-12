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
        // Regênerar Mana
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + this.manaRegen);
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

        // Colisões com as bordas (margem de 30px para não ficar preso nas paredes)
        const wallMargin = 30;
        this.x = Math.max(wallMargin, Math.min(canvasWidth - wallMargin, this.x));
        this.y = Math.max(wallMargin, Math.min(canvasHeight - wallMargin, this.y));

        // Dash Logic (Agora gasta Mana!)
        let dashCost = 30;
        if (this.dashDiscount) dashCost = Math.max(5, Math.floor(dashCost * (1 - this.dashDiscount)));
        if ((keys[' '] || keys['Shift']) && this.canDash && this.mana >= dashCost && (dx !== 0 || dy !== 0)) {
            this.mana -= dashCost;
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

        // Pequeno flash de invencibilidade após tomar dano
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
            ctx.arc(this.x - this.direction.x * 12, this.y - this.direction.y * 12, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x - this.direction.x * 24, this.y - this.direction.y * 24, this.radius * 0.8, 0, Math.PI * 2);
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

        // Corpo Base (Cota de Malha / Armadura de Couro por baixo)
        ctx.fillStyle = '#404040';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Placas de Armadura Peitoral (Aço)
        ctx.fillStyle = '#8c8c8c';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ombreiras (Espaldeiras de Aço Prateado)
        ctx.fillStyle = '#a0a0a0';
        const shoulderAngle = this.angle + Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(this.x + Math.cos(shoulderAngle) * 16, this.y + Math.sin(shoulderAngle) * 16, 9, 14, shoulderAngle, 0, Math.PI * 2);
        ctx.ellipse(this.x - Math.cos(shoulderAngle) * 16, this.y - Math.sin(shoulderAngle) * 16, 9, 14, shoulderAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Capacete (Elmo de Cavaleiro)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = '#737373';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Fenda do Elmo (Espaço para os olhos na escuridão)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(4, -5, 8, 10);
        ctx.fillStyle = '#8b0000'; // Olhos vermelhos brilhantes (Opcional, dá um ar dark fantasy)
        ctx.fillRect(6, -2, 2, 4);
        
        ctx.restore();

        ctx.restore();
    }

    drawWeapon(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.attackType === 'sword') {
            // Desenho de uma Montante (Arma Medieval Pesada)
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000';

            // Empunhadura (Hilt) - Couro escuro
            ctx.fillStyle = '#2d1b10';
            ctx.fillRect(5, -3, 15, 6);
            ctx.fillStyle = '#1a1a1a'; // Pomo da espada
            ctx.beginPath(); ctx.arc(5, 0, 4, 0, Math.PI*2); ctx.fill();

            // Guarda (Crossguard) - Ferro batido
            ctx.fillStyle = '#404040';
            ctx.fillRect(18, -14, 4, 28);
            ctx.beginPath();
            ctx.moveTo(18, -14); ctx.lineTo(14, -18); ctx.lineTo(22, -14); ctx.fill();
            ctx.moveTo(18, 14); ctx.lineTo(14, 18); ctx.lineTo(22, 14); ctx.fill();

            // Lâmina (Blade) - Aço sujo/desgastado
            ctx.fillStyle = '#b3b3b3';
            ctx.beginPath();
            ctx.moveTo(22, -5);
            ctx.lineTo(85, -3);
            ctx.lineTo(95, 0); // Ponta
            ctx.lineTo(85, 3);
            ctx.lineTo(22, 5);
            ctx.closePath();
            ctx.fill();

            // Fio de corte central (Sangueira)
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(22, -1);
            ctx.lineTo(75, 0);
            ctx.lineTo(22, 1);
            ctx.fill();

            // Efeito de movimento físico (Corte veloz de vento/metal)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.arc(0, 0, 80, -0.7, 0.7);
            ctx.stroke();

        } else if (this.attackType === 'bow') {
            // Desenho de um Arco Longo de Madeira Escura
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000';

            // Corpo do arco (Madeira nobre/Yew)
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(10, 0, 35, -Math.PI / 1.7, Math.PI / 1.7);
            ctx.stroke();
            
            // Textura da madeira
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(10, 0, 35, -Math.PI / 1.7, Math.PI / 1.7);
            ctx.stroke();

            // Corda sendo puxada
            ctx.strokeStyle = '#d7ccc8'; // Linho/Cânhamo
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10 + Math.cos(-Math.PI / 1.7) * 35, Math.sin(-Math.PI / 1.7) * 35);
            ctx.lineTo(-8, 0); // Ponto de puxada profunda (Gasta mana!)
            ctx.lineTo(10 + Math.cos(Math.PI / 1.7) * 35, Math.sin(Math.PI / 1.7) * 35);
            ctx.stroke();
            
            // Flecha posicionada (Haste de madeira, ponta de aço)
            ctx.fillStyle = '#8d6e63'; // Madeira da flecha
            ctx.fillRect(-8, -1, 30, 2);
            ctx.fillStyle = '#e0e0e0'; // Ponta de aço
            ctx.beginPath();
            ctx.moveTo(22, -3); ctx.lineTo(32, 0); ctx.lineTo(22, 3);
            ctx.fill();
            ctx.fillStyle = '#ffffff'; // Penas (Fletching)
            ctx.fillRect(-8, -3, 6, 2);
            ctx.fillRect(-8, 1, 6, 2);
        }

        ctx.restore();
    }
}
