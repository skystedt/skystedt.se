import { Configuration, Descriptor, Locator, Manifest, structUtils } from '@yarnpkg/core';
import { protocol } from './index';

const peerDelimiter = ';';
const peerRegex = /^([^:]*)(?::(.*))?$/;
const peerRemove = ['', '-'];

const unknownRange = 'unknown';
const unspecifiedRange = '';
const anyRange = '*';

export function isPeerDescriptor(descriptor: Descriptor): boolean {
  return descriptor.range.startsWith(protocol);
}

export function isPeerLocator(locator: Locator): boolean {
  return locator.reference.startsWith(protocol);
}

export function includeManifestRange(
  configuration: Configuration,
  manifest: Manifest,
  descriptor: Descriptor
): Descriptor {
  const manifestDescriptor =
    manifest.devDependencies.get(descriptor.identHash) ??
    manifest.dependencies.get(descriptor.identHash) ??
    structUtils.makeDescriptor(descriptor, unspecifiedRange);
  const manifestRange = configuration.normalizeDependency(manifestDescriptor).range;

  const newRange = changeManifestRange(descriptor.range, manifestRange);
  const result = structUtils.makeDescriptor(descriptor, newRange);
  return result;
}

export function extractManifestRange(range: string): string {
  return structUtils.parseRange(range).source;
}

export function changeManifestRange(range: string, sourceRange: string): string {
  const descriptorRange = structUtils.parseRange(range);
  descriptorRange.source = sourceRange;
  const result = structUtils.makeRange(descriptorRange);
  return result;
}

export function isUnspecifiedManifestRange(range: string): boolean {
  const manifestRange = extractManifestRange(range); // Manifest range is stored in the source field of the descriptor range
  const selector = structUtils.parseRange(manifestRange).selector; // Unspecified manifest range means the selector of the manifest range is empty
  return selector === unspecifiedRange;
}

export function parsePeerChanges(reference: string): { source: Descriptor; target: Descriptor | null }[] {
  const selector = structUtils.parseRange(reference).selector;
  const changes = selector.split(peerDelimiter).map((peer) => {
    const [_, left, right] = peer.match(peerRegex);

    const sourceDescriptor = structUtils.parseDescriptor(left);

    let targetDescriptor = !peerRemove.includes(right) ? structUtils.parseDescriptor(right ?? left) : null;
    if (targetDescriptor?.range === unknownRange) {
      targetDescriptor = structUtils.makeDescriptor(targetDescriptor, anyRange);
    }

    return {
      source: sourceDescriptor,
      target: targetDescriptor
    };
  });
  return changes;
}
