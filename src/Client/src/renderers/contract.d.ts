export type initializeRenderer = () => Promise<Renderer>;

export interface Renderer {
  createApplication: () => Promise<Application>;
  createContainer: () => Container;
  createTexture: (canvas: HTMLCanvasElement) => Texture;
  createSprite: (texture: Texture) => Sprite;
  createGraphics: () => Graphics;
}

export interface Application {
  get element(): HTMLElement;
  get width(): number;
  get height(): number;
  get offsetLeft(): number;
  get offsetTop(): number;
  get scale(): number;
  get ticker(): { get FPS(): number };
  resize(width: number, height: number, scale: number): void;
  offset(left: number, top: number): void;
  addContainer(container: Container): void;
}

export interface Container {
  get x(): number;
  get y(): number;
  get items(): (Sprite | Graphics)[];
  move(x: number, y: number): void;
  addItem(item: Sprite | Graphics): void;
  removeItem(item: Sprite | Graphics): void;
}

export interface Sprite {
  get visible(): boolean;
  set visible(value: boolean);
  get width(): number;
  get height(): number;
  get x(): number;
  get y(): number;
  get alpha(): number;
  set alpha(value: number);
  move(x: number, y: number): void;
  destroy(): void;
}

export interface Texture {}

export interface Graphics {
  get x(): number;
  get y(): number;
  move(x: number, y: number): void;
  clear();
  fillRect(color: number, x: number, y: number, width: number, height: number);
}
