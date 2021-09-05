import './neutralize.css';
import './index.css';
import Game from './game/game.js';

const game = new Game();
document.body.appendChild(game.canvas);

(async function () {
  const response = await fetch(`api/test`);
  const message = await response.json();
  const element = document.createElement('div');
  element.style.position = 'absolute';
  element.style.bottom = '0';
  element.style.left = '0';
  element.style.color = 'white';
  element.innerHTML = new Date(message).toISOString().replace('T', ' ').slice(0, -1);
  document.body.appendChild(element);
})();
