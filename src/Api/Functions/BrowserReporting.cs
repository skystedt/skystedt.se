using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Skystedt.Api.Services;
using System.Net;
using System.Net.Http.Headers;

namespace Skystedt.Api.Functions;

public class BrowserReporting
{
    private readonly ILogger _logger;

    public BrowserReporting(ILogger<BrowserReporting> logger)
    {
        _logger = logger;
    }

    private const string ContentTypeReports = "application/reports+json";
    private const string ContentTypeCsp = "application/csp-report";

    [Function($"{nameof(BrowserReporting)}-{nameof(Default)}")]
    public async Task<HttpResponseData> Default(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"report")] HttpRequestData request)
    {
        var contentType = ContentType(request.Headers);
        if (contentType is not ContentTypeReports)
        {
            _logger.LogWarning("Unsupported Browser Report content type header: {Header}", contentType);
            throw new ResponseException(HttpStatusCode.UnsupportedMediaType);
        }

        var report = await request.ReadAsStringAsync();
        _logger.LogWarning("Browser Report: {Report}", report); // Warning

        return request.CreateResponse();
    }

    [Function($"{nameof(BrowserReporting)}-{nameof(ContentSecurityPolicy)}")]
    public async Task<HttpResponseData> ContentSecurityPolicy(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"report/csp")] HttpRequestData request)
    {
        var contentType = ContentType(request.Headers);
        if (contentType is not ContentTypeReports and not ContentTypeCsp)
        {
            _logger.LogWarning("Unsupported CSP content type header: {Header}", contentType);
            throw new ResponseException(HttpStatusCode.UnsupportedMediaType);
        }

        var report = await request.ReadAsStringAsync();
        _logger.LogError("CSP violation: {Report}", report); // Error

        return request.CreateResponse();
    }

    private static string? ContentType(HttpHeaders headers)
    {
        return headers.TryGetValues("Content-Type", out var header) ? header.FirstOrDefault() : null;
    }
}
