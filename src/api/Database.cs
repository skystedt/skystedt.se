using Azure;
using Azure.Data.Tables;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;

namespace Skystedt.Api
{
    internal static class Database
    {
        private const string TablePartitionKey = "connection";

        private static TableEntity CreateEntity(string connectionId)
        {
            return new TableEntity { PartitionKey = TablePartitionKey, RowKey = connectionId };
        }

        public static async Task<List<string>> GetAll(TableClient table)
        {
            var query = table.QueryAsync<TableEntity>(entity => entity.PartitionKey == TablePartitionKey);
            var entities = new List<string>();
            await foreach (var entity in query)
            {
                entities.Add(entity.RowKey);
            }
            return entities;
        }

        public static async Task Add(TableClient table, string connectionId)
        {
            await table.AddEntityAsync(CreateEntity(connectionId));
        }

        public static async Task Update(TableClient table, string connectionId)
        {
            try
            {
                await table.UpdateEntityAsync(CreateEntity(connectionId), ETag.All, TableUpdateMode.Replace);
            }
            catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
            {
                // Don't throw
            }
        }

        public static async Task Remove(TableClient table, string connectionId)
        {
            try
            {
                await table.DeleteEntityAsync(TablePartitionKey, connectionId);
            }
            catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
            {
                // Don't throw
            }
        }
    }
}
