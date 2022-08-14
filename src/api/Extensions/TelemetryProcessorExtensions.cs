using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.DependencyInjection;
using System;

namespace Skystedt.Api.Extensions
{
    public static class TelemetryProcessorExtensions
    {
        public static IServiceCollection AddTelemetryProcessor(this IServiceCollection services, Func<ITelemetryProcessor, ITelemetryProcessor> telemetryProcessorFactory)
        {
            services.AddSingleton<ITelemetryModule>(new TelemetryModule(telemetryProcessorFactory));
            return services;
        }

        private class TelemetryModule : ITelemetryModule
        {
            private readonly Func<ITelemetryProcessor, ITelemetryProcessor> _telemetryProcessorFactory;

            public TelemetryModule(Func<ITelemetryProcessor, ITelemetryProcessor> telemetryProcessorFactory)
            {
                _telemetryProcessorFactory = telemetryProcessorFactory;
            }

            // Workaround for AddApplicationInsightsTelemetryProcessor not working
            // https://github.com/Azure/azure-functions-host/issues/3741
            public void Initialize(TelemetryConfiguration configuration)
            {
                configuration.TelemetryProcessorChainBuilder.Use(_telemetryProcessorFactory);
                configuration.TelemetryProcessorChainBuilder.Build();
            }
        }
    }
}
