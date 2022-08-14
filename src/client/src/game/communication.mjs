/** @typedef { import("./minis.mjs").default } Minis */
/** @typedef { import("./primitives.mjs").GamePosition } GamePosition */

export default class Communication {
  /** @type {string?} */
  #id = null;

  #attempt = 0;

  /** @param {Minis} minis */
  async connect(minis) {
    const userId = Communication.#userId();

    const response = await fetch(`/api/position/negotiate/${userId}`);
    if (!response.ok) {
      console.error(`Failed to negotiate websocket connection, status code: ${response.status}`);
      return;
    }
    const service = await response.json();

    this.#attempt++;
    const ws = new WebSocket(service.url);

    ws.onopen = () => {
      this.#attempt = 0;
    };

    ws.onclose = () => {
      const delay = Communication.#retryDelay(this.#attempt);
      setTimeout(() => {
        this.connect(minis);
      }, delay);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type.toLowerCase()) {
        case 'init': {
          this.#id = data.ownId;
          for (const id of data.ids) {
            minis.add(id);
          }
          break;
        }

        case 'connect': {
          minis.add(data.id);
          break;
        }

        case 'disconnect': {
          minis.remove(data.id);
          break;
        }

        case 'update': {
          minis.update(data.id, data.x, data.y);
          break;
        }
      }
    };
  }

  /**
   * @param {GamePosition} position
   */
  update(position) {
    if (this.#id) {
      const data = { id: this.#id, x: position.x, y: position.y };
      const sent = navigator.sendBeacon('/api/position/update', JSON.stringify(data));
      if (!sent) {
        console.warn('Failed to send beacon');
      }
    }
  }

  /** @returns {string} */
  static #userId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = Math.random().toString(36).slice(2).padEnd(11, '0');
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  /**
   * @param {number} attempt
   * @returns {number}
   */
  static #retryDelay(attempt) {
    const random = (/** @type {number} */ min, /** @type {number} */ max) =>
      Math.floor(Math.random() * (max - min + 1) + min);
    switch (attempt) {
      case 0:
      case 1:
        return 0;
      case 2:
        return random(1_000, 2_000);
      case 3:
        return random(5_000, 10_000);
      case 4:
        return random(30_000, 40_000);
      default:
        return random(600_000, 900_000);
    }
  }
}
