using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Cosmos.Table;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
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

        private readonly IConfiguration _configuration;

        public Test(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [FunctionName(nameof(Test))]
        public async Task<DateTimeOffset> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req, ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

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
