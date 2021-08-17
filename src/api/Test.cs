using Microsoft.Azure.Cosmos.Table;
#if NET5
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
#elif NETCOREAPP3_1
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
#endif
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace api
{
    public static class Test
    {
        private class TestEntity : TableEntity
        {
            public TestEntity()
            {
                PartitionKey = "test";
                RowKey = Guid.NewGuid().ToString();
            }
        }

#if NET5
        [Function(nameof(Test))]
        public static async Task<DateTimeOffset> Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequestData req, FunctionContext executionContext)
        {
            var logger = executionContext.GetLogger(nameof(Test));
#elif NETCOREAPP3_1
        [FunctionName(nameof(Test))]
        public static async Task<DateTimeOffset> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req, ILogger logger)
        {
#endif
            logger.LogInformation("C# HTTP trigger function processed a request.");

            var connectionString = Environment.GetEnvironmentVariable("StorageAccount");
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
