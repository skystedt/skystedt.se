using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace Skystedt.Api.Extensions
{
    internal class CosmosTableTelemetryProcessor : ITelemetryProcessor
    {
        private readonly ITelemetryProcessor _next;

        public CosmosTableTelemetryProcessor(ITelemetryProcessor next)
        {
            _next = next;
        }

        public void Process(ITelemetry item)
        {
            if (item is DependencyTelemetry dependency)
            {
                if (dependency.Data.Contains(".table.cosmos.azure.com") && dependency.ResultCode == "409")
                {
                    // Change 409 (Conflict) to not report a failure
                    dependency.Success = true;
                }
            }
            _next.Process(item);
        }
    }
}
