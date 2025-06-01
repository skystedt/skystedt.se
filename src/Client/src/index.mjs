import './index.css';
import './neutralize.css';

(async () => {
  const { default: Game } = await import(/* webpackPreload: true */ './game/game.mjs');

  const game = new Game(document.body);
  await game.init();
})();
