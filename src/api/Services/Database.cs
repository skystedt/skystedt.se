using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace Skystedt.Api.Services
{
    public interface IDatabase
    {
        Task<List<string>> GetAll(CancellationToken cancellationToken = default);
        Task<DateTimeOffset> Add(string id, CancellationToken cancellationToken = default);
        Task<(DateTimeOffset Previous, DateTimeOffset Current)?> Update(string id, CancellationToken cancellationToken = default);
        Task<DateTimeOffset?> Remove(string id, CancellationToken cancellationToken = default);
    }

    public static class DatabaseExtensions
    {
        public static IServiceCollection AddDatabase(this IServiceCollection services)
        {
            services.AddSingleton<IDatabase, Database>();
            return services;
        }
    }

    public class Database : IDatabase, IDisposable
    {
        private const string ConnectionStringVariable = "CosmosDB";
        private const string DatabaseName = "Skystedt";
        private const string Collection = "Connections";

        private readonly CosmosClient _client;

        private Container Container() => _client.GetContainer(DatabaseName, Collection);

        public Database(IConfiguration configuration)
        {
            var connectionString = configuration[ConnectionStringVariable]
                ?? throw new Exception($"Missing configuration: {ConnectionStringVariable}");

            var options = new CosmosClientOptions { SerializerOptions = new CosmosSerializationOptions { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase } };
            _client = new CosmosClient(connectionString, options);
        }

        private record struct DatabaseItem(string Id, int _ts = default)
        {
            public DateTimeOffset Timestamp() => DateTimeOffset.FromUnixTimeSeconds(_ts);
        }

        public async Task<List<string>> GetAll(CancellationToken cancellationToken = default)
        {
            var container = Container();
            var query = new QueryDefinition("select * from c");
            var iterator = container.GetItemQueryIterator<DatabaseItem>(query);

            var item = new List<DatabaseItem>();
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                item.AddRange(response.Resource);
            }

            return item.Select(item => item.Id).ToList();
        }

        public async Task<DateTimeOffset> Add(string id, CancellationToken cancellationToken = default)
        {
            var container = Container();
            var partitionKey = new PartitionKey(id);
            var item = new DatabaseItem(id);
            var response = await container.UpsertItemAsync(item, partitionKey, cancellationToken: cancellationToken);
            return response.Resource.Timestamp();
        }

        public async Task<(DateTimeOffset Previous, DateTimeOffset Current)?> Update(string id, CancellationToken cancellationToken = default)
        {
            try
            {
                var container = Container();
                var partitionKey = new PartitionKey(id);
                var previousResponse = await container.ReadItemAsync<DatabaseItem>(id, partitionKey, cancellationToken: cancellationToken);
                var options = new ItemRequestOptions { IfMatchEtag = previousResponse.ETag };
                var currentResponse = await container.ReplaceItemAsync(previousResponse.Resource, id, partitionKey, options, cancellationToken);
                return (previousResponse.Resource.Timestamp(), currentResponse.Resource.Timestamp());
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed)
            {
                // Item got changed between the read and replace, return the same timestamps to signal that there was no update
                return (DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }
        }

        public async Task<DateTimeOffset?> Remove(string id, CancellationToken cancellationToken = default)
        {
            try
            {
                var container = Container();
                var partitionKey = new PartitionKey(id);
                var response = await container.DeleteItemAsync<DatabaseItem>(id, partitionKey, cancellationToken: cancellationToken);
                return response.Resource.Timestamp();
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }
        }

#pragma warning disable CA1816 // Dispose methods should call SuppressFinalize
        public void Dispose()
        {
            _client.Dispose();
        }
#pragma warning restore CA1816 // Dispose methods should call SuppressFinalize
    }
}
