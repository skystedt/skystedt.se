import { ApplicationInsights, DistributedTracingModes } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    // @ts-ignore
    // eslint-disable-next-line no-undef
    instrumentationKey: INSTRUMENTATION_KEY,
    cookieCfg: {
      enabled: false
    },
    extensionConfig: {
      AppInsightsCfgSyncPlugin: {
        cfgUrl: '' // this will block fetching from default cdn, https://github.com/microsoft/ApplicationInsights-JS/blob/main/docs/WebConfig.md#disable-fetching-from-cdn
      }
    },
    distributedTracingMode: DistributedTracingModes.W3C,
    disablePageUnloadEvents: ['unload'],
    disableFetchTracking: false,
    autoTrackPageVisitTime: true
  }
});
appInsights.loadAppInsights();
appInsights.trackPageView();
/** @type {any} */ (window).insights = appInsights;
