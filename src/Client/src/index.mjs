import './neutralize.css';
import './index.css';

(async () => {
  const { default: Game } = await import('./game/game.mjs');

  const game = new Game();
  document.body.appendChild(game.canvas);
  await game.load();
  await game.start();
})();