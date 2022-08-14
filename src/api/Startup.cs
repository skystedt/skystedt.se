using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Skystedt.Api.Extensions;

[assembly: FunctionsStartup(typeof(Skystedt.Api.Startup))]

namespace Skystedt.Api
{
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            builder.Services.AddTelemetryProcessor(next => new CosmosTableTelemetryProcessor(next));
        }
    }
}
