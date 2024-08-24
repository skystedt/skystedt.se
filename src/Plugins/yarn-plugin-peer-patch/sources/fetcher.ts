import { FetchOptions, FetchResult, Fetcher, Locator, MinimalFetchOptions, structUtils } from '@yarnpkg/core';
import { PortablePath } from '@yarnpkg/fslib';
import { extractManifestRange, isPeerLocator } from './utils';

export default class PeerPatchFetcher implements Fetcher {
  supports(locator: Locator, opts: MinimalFetchOptions): boolean {
    return isPeerLocator(locator);
  }

  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath {
    return null;
  }

  async fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult> {
    const fetchRange = extractManifestRange(locator.reference);
    const fetchLocator = structUtils.makeLocator(locator, fetchRange);

    // Fetch the package with the original range
    // e.g. npm:15.0.0
    const result = await opts.fetcher.fetch(fetchLocator, opts);
    return result;
  }
}
