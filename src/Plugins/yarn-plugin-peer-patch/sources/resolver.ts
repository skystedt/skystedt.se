import {
  Descriptor,
  Locator,
  MinimalResolveOptions,
  Package,
  ResolveOptions,
  Resolver,
  structUtils
} from '@yarnpkg/core';
import {
  changeManifestRange,
  extractManifestRange,
  includeManifestRange,
  isPeerDescriptor,
  isPeerLocator,
  isUnspecifiedManifestRange,
  parsePeerChanges
} from './utils';

export default class PeerPatchResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean {
    return isPeerDescriptor(descriptor);
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean {
    return isPeerLocator(locator);
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean {
    return false;
  }

  bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): Descriptor {
    // Change the descriptor to also include the original range
    // e.g. peer-patch:#eslint@^9 -> peer-patch:npm%3A15.0.0#eslint@^9
    const workspace = opts.project.tryWorkspaceByLocator(fromLocator) ?? opts.project.topLevelWorkspace;
    return includeManifestRange(opts.project.configuration, workspace.manifest, descriptor);
  }

  getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Record<string, Descriptor> {
    // Change range from peer-patch to the original range (so the resolver can resolve the original range)
    // e.g. peer-patch:npm%3A15.0.0#eslint@^9 -> npm:15.0.0
    const manifestRange = extractManifestRange(descriptor.range);
    const manifestDescriptor = structUtils.makeDescriptor(descriptor, manifestRange);
    const sourceDescriptor = opts.project.configuration.normalizeDependency(manifestDescriptor);
    return { sourceDescriptor };
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    opts: ResolveOptions
  ): Promise<Locator[]> {
    let range = descriptor.range;

    // If the manifest range is unspecified, try to take the range from resolution dependencies
    if (isUnspecifiedManifestRange(descriptor.range)) {
      const sourceDescriptor = dependencies.sourceDescriptor;
      if (sourceDescriptor) {
        range = changeManifestRange(descriptor.range, sourceDescriptor.reference);
      }
    }

    const locator = structUtils.makeLocator(descriptor, range);
    return [locator];
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Locator[],
    opts: ResolveOptions
  ): Promise<{ locators: Locator[]; sorted: boolean }> {
    return { locators, sorted: true };
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const peerChanges = parsePeerChanges(locator.reference);

    // Resolve the package with the original range
    // e.g. npm:15.0.0
    const resolveRange = extractManifestRange(locator.reference);
    const resolveLocator = structUtils.makeLocator(locator, resolveRange);
    const resolvedPackage = await opts.resolver.resolve(resolveLocator, opts);

    // Create a new package (with changed peer dependencies) for the requested locator using the original range as a base
    const result = structUtils.renamePackage(resolvedPackage, locator);
    peerChanges.forEach((change) => {
      result.peerDependencies.delete(change.source.identHash);
      if (change.target) {
        result.peerDependencies.set(change.target.identHash, change.target);
      }
    });

    return result;
  }
}
