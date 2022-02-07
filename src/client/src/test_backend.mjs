export default class Backend {
  static test() {
    (async function () {
      const response = await fetch(`api/test`);
      const message = await response.json();
      console.log(message);
    })();
  }
}
