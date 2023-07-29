using Microsoft.Azure.Functions.Worker.Http;
using Skystedt.Api.Services;
using Skystedt.Api.Test.Helpers;

namespace Skystedt.Api.Test.Implementations;

public class CallbackPubSub : IPubSub
{
    public class Connections : List<string> { }

    public delegate Task<string> ClientConnect(string userId);
    public delegate Task ClientDisconnect(string userId, string connectionId);
    public delegate Task ConnectedCallback(HttpRequestData request);
    public delegate Task DisconnectedCallback(HttpRequestData request);

    private const string HeaderName_UserId = "UserId";
    private const string HeaderName_ConnectionId = "ConnectionId";

    private readonly Dictionary<string, Connections> _users = new();

    private readonly ConnectedCallback _connectedCallback;
    private readonly DisconnectedCallback _disconnectedCallback;

    public List<MessageList> Messages { get; } = new();

    public CallbackPubSub(
        ConnectedCallback connectedCallback,
        DisconnectedCallback disconnectedCallback)
    {
        _connectedCallback = connectedCallback;
        _disconnectedCallback = disconnectedCallback;
    }

    public async Task<string> ConnectClient(string userId)
    {
        var connectionId = Guid.NewGuid().ToString();

        _users.TryAdd(userId, new Connections());
        _users[userId].Add(connectionId);

        await _connectedCallback(CreateRequest(userId, connectionId));

        return connectionId;
    }

    public async Task DisconnectClient(string userId, string connectionId)
    {
        if (_users.TryGetValue(userId, out var connections) && connections.Contains(connectionId))
        {
            connections.Remove(connectionId);
            await _disconnectedCallback(CreateRequest(userId, connectionId));
            if (!connections.Any())
            {
                _users.Remove(userId);
            }
        }
    }

    public Task<(string Token, Uri Websocket)> Connect(string userId, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        var token = userId; // Let the token be the userId in plain text
        var websocket = new Uri("https://localhost");

        return Task.FromResult((token, websocket));
    }

    public void ValidateCallback(HttpRequestData request) { }

    public Task<(PubSub.ValidationStatus Status, string? UserId)> ValidateUser(string token)
    {
        var userId = token;  // Tthe token is the the userId in plain text
        return Task.FromResult((PubSub.ValidationStatus.Valid, (string?)userId));
    }

    public string GetUserId(HttpRequestData request) => request.Headers.GetValues(HeaderName_UserId).First();

    public string GetConnectionId(HttpRequestData request) => request.Headers.GetValues(HeaderName_ConnectionId).First();

    public (string HeaderName, string HeaderValue) AbuseProtection(HttpRequestData request) => (string.Empty, string.Empty);

    public Task Broadcast<T>(T data, string? currentConnectionId = null, CancellationToken cancellationToken = default)
        where T : class
    {
        var messages = _users.SelectMany(kvp =>
            kvp.Value.Where(connection => connection != currentConnectionId).Select(connection => new Message(kvp.Key, connection, data)))
            .ToList();
        Messages.Add(new MessageList(messages));
        return Task.CompletedTask;
    }

    public Task SendToUser<T>(T data, string userId, CancellationToken cancellationToken = default)
        where T : class
    {
        var connections = _users.TryGetValue(userId, out var outConnections) ? outConnections : Enumerable.Empty<string>();
        var messages = connections.Select(connection => new Message(userId, connection, data)).ToList();
        Messages.Add(new MessageList(messages));
        return Task.CompletedTask;
    }

    public async Task DisconnectUser(string userId, CancellationToken cancellationToken = default)
    {
        await CloseUsersOtherConnections(userId, string.Empty, cancellationToken);
    }

    public async Task CloseUsersOtherConnections(string userId, string currentConnectionId, CancellationToken cancellationToken = default)
    {
        if (_users.TryGetValue(userId, out var connections))
        {
            var connectionsToClose = connections.Where(connectionId => connectionId != currentConnectionId).ToList();
            foreach (var connectionId in connectionsToClose)
            {
                connections.Remove(connectionId);
                await _disconnectedCallback(CreateRequest(userId, connectionId));
            }
            if (!connections.Any())
            {
                _users.Remove(userId);
            }
        }
    }

    private static TestHttpRequestData CreateRequest(string userId, string connectionId)
    {
        var request = new TestHttpRequestData();
        request.Headers.Add(HeaderName_UserId, userId);
        request.Headers.Add(HeaderName_ConnectionId, connectionId);
        return request;
    }
}
