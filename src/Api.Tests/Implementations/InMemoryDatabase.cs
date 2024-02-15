using Dapper;
using Microsoft.Data.Sqlite;
using Skystedt.Api.Services;

namespace Skystedt.Api.Test.Implementations;

public class InMemoryDatabase : IDatabase, IAsyncDisposable
{
    private const string TableName = "Connections";

    private readonly SqliteConnection _connection;
    private bool _initialized = false;

    public InMemoryDatabase()
    {
        // https://learn.microsoft.com/en-us/ef/core/testing/testing-without-the-database#sqlite-in-memory
        _connection = new SqliteConnection("Filename=:memory:");
    }

    private async Task Initialize(CancellationToken cancellationToken = default)
    {
        if (!_initialized)
        {
            await _connection.OpenAsync(cancellationToken); // Dapper closes the connection if Dapper opened it, so we need to open it ourselves
            const string Query = $"CREATE TABLE {TableName} (Id VARCHAR(20) PRIMARY KEY, Timestamp DATETIMEOFFSET)";
            await _connection.ExecuteAsync(new CommandDefinition(Query, cancellationToken: cancellationToken));
            _initialized = true;
        }
    }

    public async Task<List<string>> GetAll(CancellationToken cancellationToken = default)
    {
        await Initialize(cancellationToken);
        const string Query = $"SELECT Id FROM {TableName}";
        var result = await _connection.QueryAsync<string>(new CommandDefinition(Query, cancellationToken: cancellationToken));
        return result.ToList();
    }

    public async Task<DateTimeOffset> Add(string id, CancellationToken cancellationToken = default)
    {
        await Initialize(cancellationToken);

        var timestamp = DateTimeOffset.Now;

        const string Query = $"INSERT OR REPLACE INTO {TableName} VALUES(@Id, @Timestamp)";
        await _connection.ExecuteAsync(new CommandDefinition(Query, new
        {
            Id = id,
            Timestamp = timestamp
        }, cancellationToken: cancellationToken));
        return timestamp;
    }

    public async Task<(DateTimeOffset Previous, DateTimeOffset Current)?> Update(string id, CancellationToken cancellationToken = default)
    {
        await Initialize(cancellationToken);

        var currentTimestamp = DateTimeOffset.Now;

        const string Query =
            $"SELECT Timestamp FROM {TableName} WHERE Id = @Id;" +
            $"UPDATE {TableName} SET Timestamp = @Timestamp WHERE Id = @Id";
        var result = await _connection.QuerySingleOrDefaultAsync<string?>(new CommandDefinition(Query, new
        {
            Id = id,
            Timestamp = currentTimestamp
        }, cancellationToken: cancellationToken));
        return result != null ? (DateTimeOffset.Parse(result), currentTimestamp) : null;
    }

    public async Task<DateTimeOffset?> Remove(string id, CancellationToken cancellationToken = default)
    {
        await Initialize(cancellationToken);

        const string Query =
            $"SELECT Timestamp FROM {TableName} WHERE Id = @Id;" +
            $"DELETE FROM {TableName} WHERE Id = @Id";
        var result = await _connection.QuerySingleOrDefaultAsync<string?>(new CommandDefinition(Query, new
        {
            Id = id
        }, cancellationToken: cancellationToken));
        return result != null ? DateTimeOffset.Parse(result) : null;
    }

    public async ValueTask DisposeAsync()
    {
        GC.SuppressFinalize(this);
        await _connection.DisposeAsync();
    }
}
