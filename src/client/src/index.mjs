import './neutralize.css';
import './index.css';

(async () => {
  const { default: Game } = await import('./game/game.mjs');

  const game = new Game();
  document.body.appendChild(game.canvas);
  game.load();

  const { default: Backend } = await import('./test_backend.mjs');
  Backend.test();
})();
