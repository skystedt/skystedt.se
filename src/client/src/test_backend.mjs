export default class Backend {
  static test() {
    (async function () {
      const response = await fetch(`api/test`);
      const message = await response.json();
      // eslint-disable-next-line no-console
      console.log(message);
    })();
  }
}
