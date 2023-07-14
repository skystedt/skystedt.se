using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using System;

#pragma warning disable IDE0060 // Remove unused parameter

namespace Skystedt.Api.Functions
{
    public class Ping
    {
        [FunctionName($"{nameof(Ping)}")]
        public string Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Ping)}")] HttpRequest request)
        {
            return DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
        }
    }
}

#pragma warning restore IDE0060 // Remove unused parameter
