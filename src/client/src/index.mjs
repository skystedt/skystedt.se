import './neutralize.css';
import './index.css';
import Backend from './test_backend.mjs';

import('./game/game.mjs').then(({ default: Game }) => {
  const game = new Game();
  document.body.appendChild(game.canvas);

  Backend.test();
});
