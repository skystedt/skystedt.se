using Microsoft.Azure.Functions.Worker.Http;
using Skystedt.Api.Test.Helpers;
using System.Security.Claims;
using System.Text.Json;

namespace Skystedt.Api.Test.Implementations;

public class TestHttpRequestData() : HttpRequestData(new TestFunctionContext())
{
    public override Stream Body { get; } = Stream.Null;
    public override HttpHeadersCollection Headers { get; } = [];
    public override IReadOnlyCollection<IHttpCookie> Cookies { get; } = new List<IHttpCookie>();
    public override Uri Url { get; } = new Uri("https://localhost");
    public override IEnumerable<ClaimsIdentity> Identities { get; } = new List<ClaimsIdentity>();
    public override string Method { get; } = HttpMethod.Get.ToString();

    public TestHttpRequestData(object body)
        : this()
    {
        Body = new MemoryStream();
        JsonSerializer.Serialize(Body, body);
        Body.Position = 0;
    }

    public override HttpResponseData CreateResponse()
    {
        return new TestHttpResponseData(FunctionContext);
    }
}
