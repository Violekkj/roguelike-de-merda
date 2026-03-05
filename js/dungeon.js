class Dungeon {
    constructor() {
        this.currentRoom = 1;
        this.totalRooms = 10;
        this.gameState = 'start'; // start, playing, boss_dead, game_over, victory
        this.currentBoss = null;
    }

    startNextRoom() {
        if (this.currentRoom > this.totalRooms) {
            this.gameState = 'victory';
            this.showOverlay('victory-screen');
            return;
        }

        const bossHealth = 150 + (this.currentRoom * 80);
        const bossName = this.getBossName(this.currentRoom);
        const bossColor = this.getBossColor(this.currentRoom);

        // Atribuir TEMA de boss baseado na sala
        let bossTheme = 'alien';
        if (this.currentRoom >= 7) bossTheme = 'mutant';
        else if (this.currentRoom >= 4) bossTheme = 'barbarian';

        this.currentBoss = new Boss(bossName, bossHealth, bossColor, bossTheme);
        this.gameState = 'playing';

        document.getElementById('room-number').innerText = `${this.currentRoom} / ${this.totalRooms}`;
    }

    getBossName(room) {
        const names = [
            "Sentinela de Plasma", "Nave Batedora X-1", "Supremo de Netuno",
            "General Grrog", "Bárbaro da Cicatriz", "Conquistador de Reinos",
            "Gloom Amorfo", "Mutante Radioativo", "Colosso da Podridão",
            "ANTIGRAVITY PRIME"
        ];
        return names[room - 1] || `Inimigo ${room}`;
    }

    getBossColor(room) {
        const colors = [
            '#ff4d4d', '#4dffb5', '#4da6ff', '#ffb54d',
            '#b54dff', '#ffff4d', '#4dffff', '#ff4dff',
            '#ff804d', '#ffffff'
        ];
        return colors[(room - 1) % colors.length];
    }

    update(player) {
        if (this.gameState === 'playing' && this.currentBoss) {
            if (this.currentBoss.health <= 0) {
                this.gameState = 'boss_dead';
                setTimeout(() => {
                    this.currentRoom++;
                    this.startNextRoom();
                }, 1500);
            }

            if (player.health <= 0) {
                this.gameState = 'game_over';
                this.showOverlay('game-over-screen');
            }
        }
    }

    showOverlay(id) {
        document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    restart() {
        this.currentRoom = 1;
        this.gameState = 'playing';
        this.startNextRoom();
        document.querySelectorAll('.overlay-screen').forEach(s => s.classList.remove('active'));
    }
}
