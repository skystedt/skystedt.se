import { Plugin } from '@yarnpkg/core';
import PeerPatchFetcher from './fetcher';
import PeerPatchResolver from './resolver';

export const protocol = 'peer-patch:';

const plugin: Plugin = {
  fetchers: [PeerPatchFetcher],
  resolvers: [PeerPatchResolver]
};

export default plugin;
