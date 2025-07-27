import webpack from 'webpack';

export default class ThrowOnUnnamedChunkPlugin {
  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.emit.tap(ThrowOnUnnamedChunkPlugin.name, (compilation) => {
      compilation.chunks.forEach((chunk) => {
        if (!chunk.name) {
          throw new Error(`Unnamed chunk: ${chunk.id}`);
        }
      });
    });
  }
}
