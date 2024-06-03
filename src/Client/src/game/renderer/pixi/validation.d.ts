import * as Contract from '../contract';
import * as Implementation from './pixi.mjs';

// File is used to validate that the implementation correctly implements the contract

declare class Application extends Implementation.Application implements Contract.Application {}
declare class Display extends Implementation.Display implements Contract.Display {}
declare class Container extends Implementation.Container implements Contract.Container {}
declare class Sprite extends Implementation.Sprite implements Contract.Sprite {}
declare class Texture extends Implementation.Texture implements Contract.Texture {}
declare class Graphics extends Implementation.Graphics implements Contract.Graphics {}
