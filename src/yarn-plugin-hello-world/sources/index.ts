import { Configuration, Descriptor, FetchOptions, FetchResult, Fetcher, Locator, Manifest, MinimalFetchOptions, MinimalResolveOptions, Package, Plugin, ResolveOptions, Resolver, structUtils } from '@yarnpkg/core';
import { PortablePath } from '@yarnpkg/fslib';

const protocol = 'peer:';
const peerDelimiter = ';';
const peerRegex = /^([^:]*)(?::(.*))?$/;
const unknownRange = 'unknown';
const latestRange = 'latest';

function isPeerDescriptor(descriptor: Descriptor): boolean {
    return descriptor.range.startsWith(protocol);
}

function isPeerLocator(locator: Locator): boolean {
    return locator.reference.startsWith(protocol);
}

function includeManifestRange(configuration: Configuration, manifest: Manifest, descriptor: Descriptor): Descriptor {
    const manifestDescriptor = manifest.devDependencies.get(descriptor.identHash)
        ?? manifest.dependencies.get(descriptor.identHash)
        ?? structUtils.makeDescriptor(descriptor, latestRange);
    const manifestRange = configuration.normalizeDependency(manifestDescriptor).range;

    const descriptorRange = structUtils.parseRange(descriptor.range);
    descriptorRange.source = manifestRange;

    const newRange = structUtils.makeRange(descriptorRange);
    const result = structUtils.makeDescriptor(descriptor, newRange);
    return result;
}

function extractManifestRange(range: string): string {
    return structUtils.parseRange(range).source;
}

function parsePeerChanges(reference: string): { source: Descriptor, target: Descriptor | null }[] {
    const selector = structUtils.parseRange(reference).selector;
    const changes = selector.split(peerDelimiter).map(peer => {
        const [_, left, right] = peer.match(peerRegex);


        const sourceDescriptor = structUtils.parseDescriptor(left);

        let targetDescriptor = right !== '' ? structUtils.parseDescriptor(right ?? left) : null;
        if (targetDescriptor?.range === unknownRange) {
            targetDescriptor = structUtils.makeDescriptor(targetDescriptor, latestRange);
        }

        return {
            source: sourceDescriptor,
            target: targetDescriptor
        };
    });
    return changes;
}

export class PeerFetcher implements Fetcher {
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

export class PeerResolver implements Resolver {
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
        // e.g. peer:#eslint@^9 -> peer:npm%3A15.0.0#eslint@^9
        const workspace = opts.project.tryWorkspaceByLocator(fromLocator) ?? opts.project.topLevelWorkspace;
        return includeManifestRange(opts.project.configuration, workspace.manifest, descriptor);
    }

    getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Record<string, Descriptor> {
        // Include a descriptor for the original range (required by other commands)
        // e.g. npm:15.0.0
        const manifestRange = extractManifestRange(descriptor.range);
        const manifestDescriptor = structUtils.makeDescriptor(descriptor, manifestRange);
        const sourceDescriptor = opts.project.configuration.normalizeDependency(manifestDescriptor);
        return { sourceDescriptor };
    }

    async getCandidates(descriptor: Descriptor, dependencies: Record<string, Package>, opts: ResolveOptions): Promise<Locator[]> {
        const locator = structUtils.makeLocator(descriptor, descriptor.range);
        return [locator];
    }

    async getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Locator[], opts: ResolveOptions): Promise<{ locators: Locator[]; sorted: boolean; }> {
        return opts.resolver.getSatisfying(descriptor, dependencies, locators, opts);
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
        peerChanges.forEach(change => {
            result.peerDependencies.delete(change.source.identHash);
            if (change.target) {
                result.peerDependencies.set(change.target.identHash, change.target);
            }
        });

        return result;
    }
}

const plugin: Plugin = {
    fetchers: [PeerFetcher],
    resolvers: [PeerResolver]
};

export default plugin;
