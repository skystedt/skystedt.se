﻿using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Skystedt.Api.Functions;

public class Ping
{
    [Function($"{nameof(Ping)}")]
    public string Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Ping)}")] HttpRequestData request)
    {
        return DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
    }
}
