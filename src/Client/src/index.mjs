/* eslint-disable no-console */
import './index.css';
import './neutralize.css';

(async () => {
  const container = document.querySelector('#log');
  // @ts-ignore
  console.stdlog = console.log.bind(console);
  // @ts-ignore
  const logFunction = (...arguments_) => {
    const messageElement = document.createElement('p');
    // @ts-ignore
    messageElement.textContent = arguments_;
    container?.append(messageElement);
    // @ts-ignore
    // eslint-disable-next-line prefer-spread
    console.stdlog.apply(console, arguments_);
  };
  console.log = logFunction;
  console.debug = logFunction;
  console.warn = logFunction;
  console.error = logFunction;
  console.info = logFunction;
  console.trace = logFunction;

  const { default: Game } = await import('./game/game.mjs');

  const game = new Game(document.body);
  await game.init();
})();
/* eslint-enable no-console */
