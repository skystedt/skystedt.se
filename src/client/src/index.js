import './neutralize.css';
import './index.css';
import Game from './game/game.js';

const game = new Game();
document.body.appendChild(game.canvas);