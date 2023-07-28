using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Skystedt.Api.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        builder.AddResponseExceptions();
    },
    options =>
    {
        options.EnableUserCodeException = true;
    })
    .ConfigureAppConfiguration(builder =>
    {
        builder.AddUserSecrets<Program>();
    })
    .ConfigureServices(services =>
    {
        services.AddApplicationLogging();
        services.AddDatabase();
        services.AddPubSub();
    })
    .Build();

host.Run();
