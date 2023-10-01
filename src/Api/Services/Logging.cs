using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.ApplicationInsights;

namespace Skystedt.Api.Services;

public static class LoggingExtensions
{
    public static IServiceCollection AddApplicationLogging(this IServiceCollection services)
    {
        services.AddApplicationInsightsTelemetryWorkerService(options =>
        {
            options.EnableAdaptiveSampling = false; // Disables adaptive sampling in the worker (host is configured in host.json)
        });
        services.ConfigureFunctionsApplicationInsights();

        services.Configure<LoggerFilterOptions>(options => // Remove Application Insights default logging filter
            options.Rules.Remove(options.Rules.Single(rule => rule.ProviderName == typeof(ApplicationInsightsLoggerProvider).FullName)));

        return services;
    }
}
