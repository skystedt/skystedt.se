const WebsocketNormalClose = 1000;

/** @enum {string} */
export const MessageType = {
  Init: 'Init',
  Connect: 'Connect',
  Disconnect: 'Disconnect',
  Update: 'Update'
};

export default class Communication {
  /** @type {(data: any) => void} */
  #receivedCallback;
  /** @type {() => void} */
  #updateCallback;

  #connectionAttempt = 1;
  /**
   * @type {{
   *   ws: WebSocket,
   *   token: string,
   *   expiresAt: Date,
   *   intervalId: ReturnType<typeof setInterval>,
   *   reconnect: boolean
   * }?}
   */
  #connection = null;

  /**
   * @param {(data: any) => void} receivedCallback
   * @param {() => void} updateCallback
   */
  constructor(receivedCallback, updateCallback) {
    this.#receivedCallback = receivedCallback;
    this.#updateCallback = updateCallback;
  }

  async connect() {
    const negotiation = await this.#negotiate();
    if (negotiation) {
      this.#createWebsocket(
        negotiation.token,
        negotiation.expiresAt,
        negotiation.websocketUrl,
        negotiation.updateInterval
      );
    }
  }

  /** @param {any} data */
  sendBeacon(data) {
    if (this.#connection) {
      const body = Object.assign({ token: this.#connection.token }, data);
      navigator.sendBeacon('/api/position/update', JSON.stringify(body));
    }
  }

  /**
   * @returns {Promise<{
   *   token: string,
   *   expiresAt: Date,
   *   websocketUrl: string,
   *   updateInterval: number
   * }?>}
   */
  async #negotiate() {
    const response = await fetch(`/api/position/negotiate`);
    if (!response.ok) {
      console.error(`Failed to negotiate websocket connection, status code: ${response.status}`);
      return null;
    }
    const { token, expiresAt, websocket, updateInterval } = await response.json();
    return {
      token,
      expiresAt: new Date(expiresAt),
      websocketUrl: websocket,
      updateInterval
    };
  }

  /**
   * @param {string} token
   * @param {Date} expiresAt
   * @param {string} websocketUrl
   * @param {number} updateInterval
   */
  #createWebsocket(token, expiresAt, websocketUrl, updateInterval) {
    const ws = new WebSocket(websocketUrl);

    // Events will not run before the websocket has connected, https://stackoverflow.com/a/53519282

    ws.onopen = () => {
      this.#connectionAttempt = 1;

      const intervalId = setInterval(() => {
        if (this.#connection) {
          if (new Date() > this.#connection.expiresAt) {
            this.#connection.reconnect = true;
            this.#connection.ws.close();
            return;
          }
          this.#updateCallback();
        }
      }, updateInterval);

      this.#connection = { ws, token, expiresAt, intervalId, reconnect: false };
    };

    ws.onclose = (event) => {
      if (this.#connection) {
        clearInterval(this.#connection.intervalId);
        const reconnect = this.#connection.reconnect;
        this.#connection = null;
        if (reconnect) {
          this.connect(); // Not awaiting
        }
      }

      if (event.code !== WebsocketNormalClose) {
        this.#connectionAttempt++;
        const delay = Communication.#retryDelay(this.#connectionAttempt);
        setTimeout(() => {
          this.#createWebsocket(token, expiresAt, websocketUrl, updateInterval);
        }, delay);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.#receivedCallback(data);
    };
  }

  /**
   * @param {number} attempt
   * @returns {number}
   */
  static #retryDelay(attempt) {
    const random = (/** @type {number} */ min, /** @type {number} */ max) =>
      Math.floor(Math.random() * (max - min + 1) + min);
    switch (attempt) {
      // first time there is a retry it will be attempt
      case 2:
        return 0;
      case 3:
        return random(1_000, 2_000);
      case 4:
        return random(5_000, 10_000);
      case 5:
        return random(30_000, 40_000);
      default:
        return random(600_000, 900_000);
    }
  }
}
