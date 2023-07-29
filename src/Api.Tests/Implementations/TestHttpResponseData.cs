using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace Skystedt.Api.Test.Implementations;

public class TestHttpResponseData : HttpResponseData
{
    public override HttpStatusCode StatusCode { get; set; }
    public override HttpHeadersCollection Headers { get; set; } = new HttpHeadersCollection();
    public override Stream Body { get; set; } = Stream.Null;
    public override HttpCookies Cookies { get; } = new TestHttpCookies();

    public TestHttpResponseData(FunctionContext functionContext)
        : base(functionContext)
    { }

    private class TestHttpCookies : HttpCookies
    {
        private readonly List<IHttpCookie> _cookies = new();
        public override void Append(string name, string value) => _cookies.Add(new HttpCookie(name, value));
        public override void Append(IHttpCookie cookie) => _cookies.Add(cookie);
        public override IHttpCookie CreateNew() => new HttpCookie(string.Empty, string.Empty);
    }
}
