import webpack from 'webpack';

export default class ThrowOnUnnamedChunkPlugin {
  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.emit.tap(ThrowOnUnnamedChunkPlugin.name, (compilation) => {
      for (const chunk of compilation.chunks) {
        if (!chunk.name) {
          throw new Error(`Unnamed chunk: ${chunk.id}`);
        }
      }
    });
  }
}
