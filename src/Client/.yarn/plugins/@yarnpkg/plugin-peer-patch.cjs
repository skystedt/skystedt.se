/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-peer-patch",
factory: function (require) {
var plugin=(()=>{var D=Object.defineProperty;var O=Object.getOwnPropertyDescriptor;var b=Object.getOwnPropertyNames;var y=Object.prototype.hasOwnProperty;var h=(r=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(r,{get:(e,t)=>(typeof require<"u"?require:e)[t]}):r)(function(r){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+r+'" is not supported')});var F=(r,e)=>{for(var t in e)D(r,t,{get:e[t],enumerable:!0})},w=(r,e,t,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of b(e))!y.call(r,s)&&s!==t&&D(r,s,{get:()=>e[s],enumerable:!(o=O(e,s))||o.enumerable});return r};var C=r=>w(D({},"__esModule",{value:!0}),r);var S={};F(S,{default:()=>E,protocol:()=>R});var x=h("@yarnpkg/core");var n=h("@yarnpkg/core");var U=";",j=/^([^:]*)(?::(.*))?$/,H=["","-"],W="unknown",L="",z="*";function P(r){return r.range.startsWith(R)}function m(r){return r.reference.startsWith(R)}function v(r,e,t){let o=e.devDependencies.get(t.identHash)??e.dependencies.get(t.identHash)??n.structUtils.makeDescriptor(t,L),s=r.normalizeDependency(o).range,c=d(t.range,s);return n.structUtils.makeDescriptor(t,c)}function p(r){return n.structUtils.parseRange(r).source}function d(r,e){let t=n.structUtils.parseRange(r);return t.source=e,n.structUtils.makeRange(t)}function k(r){let e=p(r);return n.structUtils.parseRange(e).selector===L}function M(r){return n.structUtils.parseRange(r).selector.split(U).map(o=>{let[s,c,i]=o.match(j),l=n.structUtils.parseDescriptor(c),a=H.includes(i)?null:n.structUtils.parseDescriptor(i??c);return a?.range===W&&(a=n.structUtils.makeDescriptor(a,z)),{source:l,target:a}})}var g=class{supports(e,t){return m(e)}getLocalPath(e,t){return null}async fetch(e,t){let o=p(e.reference),s=x.structUtils.makeLocator(e,o);return await t.fetcher.fetch(s,t)}};var u=h("@yarnpkg/core");var f=class{supportsDescriptor(e,t){return P(e)}supportsLocator(e,t){return m(e)}shouldPersistResolution(e,t){return!1}bindDescriptor(e,t,o){let s=o.project.tryWorkspaceByLocator(t)??o.project.topLevelWorkspace;return v(o.project.configuration,s.manifest,e)}getResolutionDependencies(e,t){let o=p(e.range),s=u.structUtils.makeDescriptor(e,o);return{sourceDescriptor:t.project.configuration.normalizeDependency(s)}}async getCandidates(e,t,o){let s=e.range;if(k(e.range)){let i=t.sourceDescriptor;i&&(s=d(e.range,i.reference))}return[u.structUtils.makeLocator(e,s)]}async getSatisfying(e,t,o,s){return{locators:o,sorted:!0}}async resolve(e,t){let o=M(e.reference),s=p(e.reference),c=u.structUtils.makeLocator(e,s),i=await t.resolver.resolve(c,t),l=u.structUtils.renamePackage(i,e);return o.forEach(a=>{l.peerDependencies.delete(a.source.identHash),a.target&&l.peerDependencies.set(a.target.identHash,a.target)}),l}};var R="peer-patch:",B={fetchers:[g],resolvers:[f]},E=B;return C(S);})();
return plugin;
}
};
