import './neutralize.css';
import './index.css';
import Game from './game/game';

const game = new Game();
document.body.appendChild(game.canvas);

(async function () {
  const response = await fetch(`api/test`);
  const message = await response.json();
  const date = new Date(message);
  console.log(date);
})();
