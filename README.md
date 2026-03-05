# Antigravity Roguelike - Boss Rush

Um jogo Roguelike focado em Boss Rush, desenvolvido com HTML5 Canvas, CSS moderno e Vanilla JavaScript.

## 🎮 Como Jogar

1. Abra o arquivo `index.html` em qualquer navegador moderno.
2. Enfrente uma sequência de **10 chefes únicos**.
3. Use suas habilidades para sobreviver:
   - **WASD**: Movimentação
   - **Botão Esquerdo do Mouse**: Ataque de Espada (Dano alto, curto alcance)
   - **Botão Direito do Mouse**: Ataque de Arco (Dano moderado, gasta stamina)
   - **Espaço / Shift**: Dash (Frames de invencibilidade, cooldown de 1.2s)

## 🛠️ Arquitetura do Projeto

- `index.html`: Estrutura principal e UI.
- `css/style.css`: Estilização premium com glassmorphism.
- `js/main.js`: Loop principal, entrada de comandos e combate.
- `js/player.js`: Classe do jogador e gerenciamento de atributos.
- `js/boss.js`: Classe base para os 10 guardiões.
- `js/dungeon.js`: Gerenciador de progresso entre as salas.

## 🚀 Workflow (GitHub Desktop)

1. Faça as alterações nos arquivos.
2. No **GitHub Desktop**, verifique os arquivos alterados.
3. Escreva uma mensagem de commit clara (ex: `feat: implementado sistema de dash`).
4. Clique em `Commit to main`.
5. Clique em `Push origin` para atualizar o repositório e o deploy no GitHub Pages.
