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

        const config = this.getBossConfig(this.currentRoom);
        this.currentBoss = new Boss(config);
        this.gameState = 'playing';

        document.getElementById('room-number').innerText = `${this.currentRoom} / ${this.totalRooms}`;
    }

    getBossConfig(room) {
        // Configuramos cada um dos 10 bosses individualmente aqui
        switch(room) {
            case 1: return {
                name: "Aprendiz Sombrio", health: 150, color: '#ff4d4d',
                radius: 40, speed: 2.0, moveType: 'wander',
                visualTheme: 'apprentice', patterns: ['slow_blood_orb'], cooldown: 2000
            };
            case 2: return {
                name: "Esqueleto Brucutu", health: 250, color: '#e0e0e0',
                radius: 55, speed: 2.8, moveType: 'chase',
                visualTheme: 'skeleton', patterns: ['bone_throw', 'dash_strike'], cooldown: 1800
            };
            case 3: return {
                name: "Cultista das Chamas", health: 350, color: '#ff8c00',
                radius: 45, speed: 2.2, moveType: 'wander',
                visualTheme: 'cultist', patterns: ['fireball_spread', 'fire_nova'], cooldown: 1500
            };
            case 4: return {
                name: "Cavaleiro Caído", health: 500, color: '#708090',
                radius: 50, speed: 3.0, moveType: 'chase',
                visualTheme: 'fallen_knight', patterns: ['sword_wave', 'heavy_slam'], cooldown: 1600
            };
            case 5: return {
                name: "Slime Tóxico", health: 650, color: '#32cd32',
                radius: 80, speed: 1.5, moveType: 'wander',
                visualTheme: 'slime', patterns: ['poison_spit', 'slime_split'], cooldown: 1400
            };
            case 6: return {
                name: "Assassino das Sombras", health: 400, color: '#4b0082',
                radius: 35, speed: 4.5, moveType: 'patrol',
                visualTheme: 'assassin', patterns: ['dagger_fan', 'shadow_step'], cooldown: 1000
            };
            case 7: return {
                name: "Golem de Cristal", health: 900, color: '#00ced1',
                radius: 70, speed: 1.2, moveType: 'chase',
                visualTheme: 'golem', patterns: ['ice_spike', 'frost_nova'], cooldown: 2200
            };
            case 8: return {
                name: "Senhor das Cinzas", health: 750, color: '#b22222',
                radius: 65, speed: 2.5, moveType: 'chase',
                visualTheme: 'warlord', patterns: ['fire_wave', 'meteor_strike'], cooldown: 1500
            };
            case 9: return {
                name: "Sacerdotisa do Vazio", health: 600, color: '#800080',
                radius: 40, speed: 3.5, moveType: 'teleport',
                visualTheme: 'priestess', patterns: ['void_rings', 'teleport_blast'], cooldown: 1200
            };
            case 10: return {
                name: "DRAGÃO ANTIGRAVITY", health: 1500, color: '#ff0000',
                radius: 100, speed: 2.0, moveType: 'hover',
                visualTheme: 'dragon', patterns: ['flame_breath', 'tail_whip', 'meteor_shower'], cooldown: 1800
            };
            default: return {
                name: `Aberraçao ${room}`, health: 1000, color: '#fff',
                radius: 50, speed: 2.5, moveType: 'wander',
                visualTheme: 'apprentice', patterns: ['slow_blood_orb'], cooldown: 2000
            };
        }
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
