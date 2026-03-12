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
        let bossTheme = 'warlock';
        if (this.currentRoom >= 7) bossTheme = 'beast';
        else if (this.currentRoom >= 4) bossTheme = 'knight';

        this.currentBoss = new Boss(bossName, bossHealth, bossColor, bossTheme);
        this.gameState = 'playing';

        document.getElementById('room-number').innerText = `${this.currentRoom} / ${this.totalRooms}`;
    }

    getBossName(room) {
        const names = [
            "Aprendiz Sombrio", "Cabalista de Fogo", "Senhor Necromante",
            "Cavaleiro Decaído", "Vanguarda de Ferro", "Lorde Comandante",
            "Lobo Terrível", "Mantícora Espinhosa", "Wyvern das Profundezas",
            "DRAGÃO ANTIGRAVITY"
        ];
        return names[room - 1] || `Aberraçao ${room}`;
    }

    getBossColor(room) {
        const colors = [
            '#ff4d4d', '#ff8c00', '#9932cc', '#708090',
            '#4682b4', '#d4af37', '#8b4513', '#556b2f',
            '#2f4f4f', '#8b0000'
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
