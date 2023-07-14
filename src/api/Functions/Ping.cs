using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;

#pragma warning disable IDE0060 // Remove unused parameter

namespace Skystedt.Api.Functions
{
    public class Ping
    {
        private readonly IConfiguration _configuration;

        public Ping(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [FunctionName($"{nameof(Ping)}")]
        public string Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Ping)}")] HttpRequest request)
        {
            return DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
        }

        [FunctionName($"{nameof(Ping)}-{nameof(Config)}")]
        public Dictionary<string, string?> Config(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Ping)}/{nameof(Config)}")] HttpRequest request)
        {
            return new Dictionary<string, string?>
            {
                ["APPINSIGHTS_INSTRUMENTATIONKEY"] = _configuration["APPINSIGHTS_INSTRUMENTATIONKEY"],
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"] = _configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"],
                ["CosmosTableConnectionString"] = _configuration["CosmosTableConnectionString"]?[..122],
                ["WebPubSubConnectionString"] = _configuration["WebPubSubConnectionString"]?[..56]
            };
        }
    }
}

#pragma warning restore IDE0060 // Remove unused parameter
