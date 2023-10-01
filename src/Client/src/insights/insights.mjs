import { ApplicationInsights, DistributedTracingModes } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    // @ts-ignore
    // eslint-disable-next-line no-undef
    instrumentationKey: INSTRUMENTATION_KEY,
    cookieCfg: {
      enabled: false
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
