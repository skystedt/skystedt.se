using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Cosmos.Table;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using System;
using System.Net;
using System.Threading.Tasks;

namespace Skystedt.Api
{
    public class Test
    {
        private class TestEntity : TableEntity
        {
            public TestEntity()
            {
                PartitionKey = "test";
                RowKey = Guid.NewGuid().ToString();
            }
        }

        private readonly ILogger<Test> _logger;
        private readonly IConfiguration _configuration;

        public Test(ILogger<Test> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        [FunctionName(nameof(Test))]
        [OpenApiOperation(operationId: "Run", tags: new[] { "name" })]
        //[OpenApiParameter(name: "name", In = ParameterLocation.Query, Required = true, Type = typeof(string), Description = "The **Name** parameter")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "text/plain", bodyType: typeof(DateTimeOffset), Description = "The OK response")]
        public async Task<DateTimeOffset> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function processed a request.");

            var connectionString = _configuration["StorageAccount"];
            var storageAccount = CloudStorageAccount.Parse(connectionString);
            var tableClient = storageAccount.CreateCloudTableClient();
            var table = tableClient.GetTableReference("test");

            await table.CreateIfNotExistsAsync();

            var entity = new TestEntity();
            var operation = TableOperation.Insert(entity);
            var result = await table.ExecuteAsync(operation);
            entity = result.Result as TestEntity;

            return entity.Timestamp;
        }
    }
}
