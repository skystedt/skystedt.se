using Microsoft.Azure.Functions.Worker.OpenTelemetry;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Azure.Monitor.OpenTelemetry.AspNetCore;

namespace Skystedt.Api.Services;

public static class LoggingExtensions
{
    public static IServiceCollection AddApplicationLogging(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .UseAzureMonitor()
            .UseFunctionsWorkerDefaults();

        return services;
    }
}
