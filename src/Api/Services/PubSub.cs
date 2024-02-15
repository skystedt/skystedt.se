using Azure;
using Azure.Core;
using Azure.Messaging.WebPubSub;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;

namespace Skystedt.Api.Services;

public interface IPubSub
{
    Task<(string Token, Uri Websocket)> Connect(string userId, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
    Task<(PubSub.ValidationStatus Status, string? UserId)> ValidateUser(string token);
    void ValidateCallback(HttpRequestData request);
    string GetUserId(HttpRequestData request);
    string GetConnectionId(HttpRequestData request);
    (string HeaderName, string HeaderValue) AbuseProtection(HttpRequestData request);
    Task Broadcast<T>(T data, string? currentConnectionId = null, CancellationToken cancellationToken = default) where T : class;
    Task SendToUser<T>(T data, string userId, CancellationToken cancellationToken = default) where T : class;
    Task DisconnectUser(string userId, CancellationToken cancellationToken = default);
    Task CloseUsersOtherConnections(string userId, string currentConnectionId, CancellationToken cancellationToken = default);
}

public static class PubSubExtensions
{
    public static IServiceCollection AddPubSub(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PubSub.PubSubConnection>(configuration);
        services.AddSingleton<IPubSub, PubSub>();
        return services;
    }
}

public class PubSub : IPubSub
{
    public class PubSubConnection
    {
        public required string WebPubSubConnectionString { get; set; }
    }

    public enum ValidationStatus
    {
        Valid,
        Expired,
        Invalid
    }

    private const string HubName = "position";

    private const string CloudEventsHeaderSignature = "ce-signature";
    private const string CloudEventsHeaderConnectionId = "ce-connectionId";
    private const string CloudEventsHeaderUserId = "ce-userId";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly WebPubSubServiceClient _client;
    private readonly byte[] _accessKey;
    private readonly TokenValidationParameters _tokenValidationParameters;
    private readonly TokenValidationParameters _tokenExpiredValidationParameters;

    public PubSub(IOptions<PubSubConnection> settings)
    {
        _client = new WebPubSubServiceClient(settings.Value.WebPubSubConnectionString, HubName);

        _accessKey = Encoding.UTF8.GetBytes(ParseAccessKey(settings.Value.WebPubSubConnectionString));

        _tokenValidationParameters = new TokenValidationParameters
        {
            IssuerSigningKey = new SymmetricSecurityKey(_accessKey),
            ValidAudience = new Uri(_client.Endpoint, $"client/hubs/{HubName}").ToString(),
            ValidateLifetime = true,
            ValidateAudience = true,
            ValidateIssuer = false
        };

        _tokenExpiredValidationParameters = _tokenValidationParameters.Clone();
        _tokenExpiredValidationParameters.ValidateLifetime = false;
    }

    public async Task<(string Token, Uri Websocket)> Connect(string userId, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        var url = await _client.GetClientAccessUriAsync(expiresAt, userId, cancellationToken: cancellationToken);
        var token = HttpUtility.ParseQueryString(url.Query)["access_token"] ?? throw new Exception("Failed to generate user access");
        return (token, url);
    }

    public async Task<(ValidationStatus Status, string? UserId)> ValidateUser(string token)
    {
        var jwtHandler = new JwtSecurityTokenHandler();

        var result = await jwtHandler.ValidateTokenAsync(token, _tokenValidationParameters);
        if (result.IsValid)
        {
            var userId = (string)result.Claims[ClaimTypes.NameIdentifier];
            return (ValidationStatus.Valid, userId);
        }

        var expiredResult = await jwtHandler.ValidateTokenAsync(token, _tokenExpiredValidationParameters);
        if (expiredResult.IsValid)
        {
            var userId = (string)expiredResult.Claims[ClaimTypes.NameIdentifier];
            return (ValidationStatus.Expired, userId);
        }

        return (ValidationStatus.Invalid, null);
    }

    public void ValidateCallback(HttpRequestData request)
    {
        // https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-cloud-events#attributes

        var signatures = request.Headers.TryGetValues(CloudEventsHeaderSignature, out var outSignatures) ? outSignatures.SelectMany(signature => signature.Split(",")) : Array.Empty<string>();
        var connectionId = request.Headers.TryGetValues(CloudEventsHeaderConnectionId, out var outConnectionId) ? outConnectionId.FirstOrDefault() : null;
        var userId = request.Headers.TryGetValues(CloudEventsHeaderUserId, out var outUserId) ? outUserId.FirstOrDefault() : null;

        if (connectionId != null && userId != null)
        {
            string hmac = CalculateHmac(_accessKey, connectionId);

            foreach (var signature in signatures)
            {
                if (StringComparer.OrdinalIgnoreCase.Equals(hmac, signature))
                {
                    return;
                }
            }
        }

        throw new ResponseException(HttpStatusCode.Unauthorized);
    }

    public string GetUserId(HttpRequestData request)
    {
        return request.Headers.GetValues(CloudEventsHeaderUserId).First();
    }

    public string GetConnectionId(HttpRequestData request)
    {
        return request.Headers.GetValues(CloudEventsHeaderConnectionId).First();
    }

    public (string HeaderName, string HeaderValue) AbuseProtection(HttpRequestData request)
    {
        // https://github.com/cloudevents/spec/blob/main/cloudevents/http-webhook.md#4-abuse-protection
        // https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-cloud-events#webhook-validation

        const string WebHookRequestOrigin = "WebHook-Request-Origin";
        const string WebHookAllowedOrigin = "WebHook-Allowed-Origin";
        const string AllowedAllOrigins = "*";

        var allowedOrigin = _client.Endpoint.Host;
        var requestOrigin = request.Headers.TryGetValues(WebHookRequestOrigin, out var outRequestOrigin) ? outRequestOrigin.FirstOrDefault() : null;
        var valid = StringComparer.OrdinalIgnoreCase.Equals(allowedOrigin, requestOrigin);

        if (!valid)
        {
            throw new ResponseException(HttpStatusCode.BadRequest);
        }

        return (WebHookAllowedOrigin, AllowedAllOrigins);
    }

    public async Task Broadcast<T>(T data, string? currentConnectionId = null, CancellationToken cancellationToken = default)
        where T : class
    {
        var (content, contentType, context) = CreateRequest(data, cancellationToken);
        var excluded = currentConnectionId != null ? new List<string> { currentConnectionId } : null;
        await _client.SendToAllAsync(content, contentType, excluded, context);
    }

    public async Task SendToUser<T>(T data, string userId, CancellationToken cancellationToken = default)
        where T : class
    {
        var (content, contentType, context) = CreateRequest(data, cancellationToken);
        await _client.SendToUserAsync(userId, content, contentType, context);
    }

    public async Task DisconnectUser(string userId, CancellationToken cancellationToken = default)
    {
        var context = CreateRequest(cancellationToken);
        await _client.CloseUserConnectionsAsync(userId, context: context);
    }

    public async Task CloseUsersOtherConnections(string userId, string currentConnectionId, CancellationToken cancellationToken = default)
    {
        var context = CreateRequest(cancellationToken);
        var excluded = new List<string> { currentConnectionId };
        await _client.CloseUserConnectionsAsync(userId, excluded, context: context);
    }

    internal static string CalculateHmac(byte[] key, string data)
    {
        var bytes = Encoding.UTF8.GetBytes(data);
        var hash = HMACSHA256.HashData(key, bytes);
        var hmac = "sha256=" + Convert.ToHexString(hash);
        return hmac;
    }

    internal static string ParseAccessKey(string connectionString)
    {
        const string AccessKey = "AccessKey";

        return connectionString.Split(";", StringSplitOptions.RemoveEmptyEntries)
            .Select(property => property.Split("=", 2, StringSplitOptions.TrimEntries))
            .FirstOrDefault(kvp => StringComparer.OrdinalIgnoreCase.Equals(kvp[0], AccessKey))
            ?[1]
            ?? throw new ArgumentException($"Required property not found in connection string: {AccessKey}.");
    }

    private static RequestContext CreateRequest(CancellationToken cancellationToken)
    {
        var context = new RequestContext { CancellationToken = cancellationToken };
        context.AddClassifier((int)HttpStatusCode.TooManyRequests, isError: false); // Classify TooManyRequests (429) as a successful status code

        return context;
    }

    private static (RequestContent Content, ContentType ContentType, RequestContext Context) CreateRequest<T>(T data, CancellationToken cancellationToken)
        where T : class
    {
        var content = RequestContent.Create(BinaryData.FromObjectAsJson(data, JsonOptions));

        var context = CreateRequest(cancellationToken);

        return (content, ContentType.ApplicationJson, context);
    }
}
