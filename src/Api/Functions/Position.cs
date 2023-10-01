using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Skystedt.Api.Services;
using System.Net;

namespace Skystedt.Api.Functions;

public class Position
{
    internal TimeSpan TokenValidTime { get; init; } = TimeSpan.FromHours(1);
    internal TimeSpan UpdateInterval { get; init; } = TimeSpan.FromSeconds(10);
    internal TimeSpan UpdateSkew { get; init; } = TimeSpan.FromSeconds(2);

    private enum MessageType
    {
        Connect,
        Disconnect,
        Init,
        Update
    }

    private readonly IDatabase _database;
    private readonly IPubSub _pubSub;

    public Position(IDatabase database, IPubSub pubSub)
    {
        _database = database;
        _pubSub = pubSub;
    }

    public record NegotiateResponse(string UserId, string Token, DateTimeOffset ExpiresAt, Uri Websocket, int UpdateInterval);
    // Websockets connection url for new clients
    [Function($"{nameof(Position)}-{nameof(Negotiate)}")]
    public async Task<NegotiateResponse> Negotiate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Position)}/negotiate")] HttpRequestData request)
    {
        var userId = User.GenerateId();
        var expiresAt = DateTimeOffset.UtcNow.Add(TokenValidTime);
        var (token, websocket) = await _pubSub.Connect(userId, expiresAt);

        return new NegotiateResponse(userId, token, expiresAt, websocket, (int)UpdateInterval.TotalMilliseconds);
    }

    private readonly record struct PositionModel(string Token, decimal X, decimal Y);

    // Update a clients data and inform other clients of the update
    [Function($"{nameof(Position)}-{nameof(Update)}")]
    public async Task<HttpResponseData> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/update")] HttpRequestData request)
    {
        static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

        var (token, x, y) = await DeserializeRequest<PositionModel>(request);

        var userId = await ValidateToken(token);

        var timestamps = await _database.Update(userId);

        if (!timestamps.HasValue)
        {
            // Not active, probably because TTL has expired
            await _pubSub.DisconnectUser(userId);

            throw new ResponseException(HttpStatusCode.Gone);
        }

        var timeSinceLastUpdate = timestamps.Value.Current - timestamps.Value.Previous;

        if (timeSinceLastUpdate > UpdateInterval - UpdateSkew)
        {
            // Only broadcast if enough time has passed

            await _pubSub.Broadcast(new
            {
                Type = MessageType.Update,
                Id = userId,
                X = Round(x),
                Y = Round(y)
            });
        }

        return request.CreateResponse();
    }

    // Callback from websockets service when a client connects
    [Function($"{nameof(Position)}-Callback-{nameof(Connected)}")]
    public async Task<HttpResponseData> Connected(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/callback/connected")] HttpRequestData request)
    {
        _pubSub.ValidateCallback(request);

        var userId = _pubSub.GetUserId(request);
        var connectionId = _pubSub.GetConnectionId(request);

        var userIds = await _database.GetAll();
        userIds = userIds.Where(id => id != userId).ToList();

        await _database.Add(userId);

        await _pubSub.CloseUsersOtherConnections(userId, connectionId);

        await _pubSub.SendToUser(new
        {
            Type = MessageType.Init,
            Ids = userIds
        }, userId);

        await _pubSub.Broadcast(new
        {
            Type = MessageType.Connect,
            Id = userId,
        }, connectionId);

        return request.CreateResponse();
    }

    // Callback from websockets service when a client disconnects
    [Function($"{nameof(Position)}-Callback-{nameof(Disconnected)}")]
    public async Task<HttpResponseData> Disconnected(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/callback/disconnected")] HttpRequestData request)
    {
        _pubSub.ValidateCallback(request);

        var userId = _pubSub.GetUserId(request);

        await _database.Remove(userId);

        await _pubSub.Broadcast(new
        {
            Type = MessageType.Disconnect,
            Id = userId,
        });

        return request.CreateResponse();
    }

    // Abuse protecton
    [Function($"{nameof(Position)}-Callback-{nameof(Validate)}")]
    public HttpResponseData Validate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = $"{nameof(Position)}/callback/validate")] HttpRequestData request)
    {
        var (headerName, headerValue) = _pubSub.AbuseProtection(request);

        var response = request.CreateResponse();
        response.Headers.Add(headerName, headerValue);
        return response;
    }

    private async Task<string> ValidateToken(string token)
    {
        var (status, userId) = await _pubSub.ValidateUser(token);
        // userId is only null when status is Invalid

        if (status != PubSub.ValidationStatus.Valid)
        {
            if (status == PubSub.ValidationStatus.Expired)
            {
                await _pubSub.DisconnectUser(userId!);
            }

            throw new ResponseException(HttpStatusCode.Unauthorized);
        }

        return userId!;
    }

    private static async Task<T> DeserializeRequest<T>(HttpRequestData request)
        where T : struct
    {
        try
        {
            return await request.ReadFromJsonAsync<T>();
        }
        catch
        {
            throw new ResponseException(HttpStatusCode.BadGateway);
        }
    }
}
