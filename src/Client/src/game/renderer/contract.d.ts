export interface Factory {
  static initializeApplication: () => Promise<Application>;
  static createContainer: () => Container;
  static createTexture: (canvas: HTMLCanvasElement) => Texture;
  static createSprite: (source: Texture) => Sprite;
  static createGraphics: () => Graphics;
}

export interface Application {
  get canvas(): HTMLCanvasElement;
  get display(): Display;
  get ticker(): { get FPS(): number };
}

export interface Display {
  set position(value: { x: number; y: number });
  get resolution(): number;
  set resolution(value: number);
  resize(desiredScreenWidth: number, desiredScreenHeight: number): void;
  addContainer(container: Container): void;
}

export interface Container {
  get width(): number;
  get height(): number;
  get x(): number;
  get y(): number;
  set position(value: { x: number; y: number });
  get elements(): (Sprite | Graphics)[];
  addElement(element: Sprite | Graphics): void;
  removeElement(element: Sprite | Graphics): void;
}

export interface Sprite {
  get visible(): boolean;
  set visible(value: boolean);
  get width(): number;
  get height(): number;
  set position(value: { x: number; y: number });
  set alpha(value: number);
  destroy(): void;
}

export interface Texture {}

export interface Graphics {
  get x(): number;
  set x(value: number);
  get y(): number;
  set y(value: number);
  clear();
  fillRect(color: number, x: number, y: number, width: number, height: number);
}
