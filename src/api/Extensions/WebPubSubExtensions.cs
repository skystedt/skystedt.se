using Azure;
using Azure.Core;
using Azure.Core.Pipeline;
using Azure.Messaging.WebPubSub;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Description;
using Microsoft.Azure.WebJobs.Extensions.WebPubSub;
using Microsoft.Azure.WebJobs.Host.Config;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Azure.WebPubSub.Common;
using Skystedt.Api.Extensions;
using System;
using System.ComponentModel;
using System.Threading;
using System.Threading.Tasks;

[assembly: WebJobsStartup(typeof(WebPubSubStartup))]
namespace Skystedt.Api.Extensions
{
    [AttributeUsage(AttributeTargets.Parameter)]
    [Binding]
    public class ExtendedWebPubSubAttribute : Attribute
    {
        // Replacement for: https://github.com/Azure/azure-sdk-for-net/blob/Microsoft.Azure.WebJobs.Extensions.WebPubSub_1.4.0/sdk/webpubsub/Microsoft.Azure.WebJobs.Extensions.WebPubSub/src/WebPubSubAttribute.cs

        /// <summary>
        /// The connection of target Web PubSub service.
        /// </summary>
        [ConnectionString]
        public string Connection { get; set; } = new WebPubSubAttribute().Connection;

        /// <summary>
        /// Target hub.
        /// </summary>
        [AutoResolve]
        public string Hub { get; set; } = string.Empty;
    }

    internal class WebPubSubStartup : IWebJobsStartup
    {
        public void Configure(IWebJobsBuilder builder)
        {
            builder.AddExtension<WebPubSubExtensions>();
        }
    }

    internal class WebPubSubExtensions : IExtensionConfigProvider
    {
        public void Initialize(ExtensionConfigContext context)
        {
            var binding = context.AddBindingRule<ExtendedWebPubSubAttribute>();
            binding.BindToInput(attribute => new WebPubSubConnectionFactory(attribute.Connection, attribute.Hub));
            binding.BindToCollector(attribute => new WebPubSubAsyncCollector(attribute.Connection, attribute.Hub));
        }
    }

    public class WebPubSubConnectionFactory
    {
        private string Connection { get; set; }
        private string Hub { get; set; }

        public WebPubSubConnectionFactory(string connection, string hub)
        {
            Connection = connection;
            Hub = hub;
        }

        public async Task<WebPubSubConnection> CreateConnection(string? userId = null, CancellationToken cancellationToken = default)
        {
            var client = new WebPubSubServiceClient(Connection, Hub);
            var url = await client.GetClientAccessUriAsync(userId: userId, cancellationToken: cancellationToken).ConfigureAwait(false);
            var connection = new WebPubSubConnection(url);
            return connection;
        }
    }

    internal class WebPubSubAsyncCollector : IAsyncCollector<WebPubSubAction>
    {
        private readonly WebPubSubServiceClient _client;

        // https://github.com/Azure/azure-sdk-for-net/blob/Azure.Messaging.WebPubSub_1.2.0/sdk/webpubsub/Azure.Messaging.WebPubSub/src/Generated/WebPubSubServiceClient.cs#L1081
        private static HttpPipelinePolicy Policy { get; } = new ResponseClassifierOverridePolicy(new ResponseClassifier202Ignore429());

        internal WebPubSubAsyncCollector(string connectionString, string? hub)
        {
            _client = new WebPubSubServiceClient(connectionString, hub);
        }

        public async Task AddAsync(WebPubSubAction item, CancellationToken cancellationToken = default)
        {
            // Based on: https://github.com/Azure/azure-sdk-for-net/blob/Microsoft.Azure.WebJobs.Extensions.WebPubSub_1.4.0/sdk/webpubsub/Microsoft.Azure.WebJobs.Extensions.WebPubSub/src/Bindings/WebPubSubAsyncCollector.cs#L21

            var context = new RequestContext { CancellationToken = cancellationToken };

            // Used to override the ResponseClassifier with one that will not retry status code 429
            context.AddPolicy(Policy, HttpPipelinePosition.PerCall);

            switch (item)
            {
                case null:
                    throw new ArgumentNullException(nameof(item));

                case SendToAllAction action:
                    await _client.SendToAllAsync(RequestContent.Create(action.Data), GetContentType(action.DataType), action.Excluded, context).ConfigureAwait(false);
                    break;

                case SendToConnectionAction action:
                    await _client.SendToConnectionAsync(action.ConnectionId, RequestContent.Create(action.Data), GetContentType(action.DataType), context).ConfigureAwait(false);
                    break;

                default:
                    // Add more methods as needed, see link above
                    throw new ArgumentException($"Not supported WebPubSubOperation: {nameof(item)}.");
            }
        }

        public Task FlushAsync(CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        private static ContentType GetContentType(WebPubSubDataType dataType) => dataType switch
        {
            // Based on: https://github.com/Azure/azure-sdk-for-net/blob/Microsoft.Azure.WebJobs.Extensions.WebPubSub_1.4.0/sdk/webpubsub/Microsoft.Azure.WebJobs.Extensions.WebPubSub/src/Utilities.cs#L21
            WebPubSubDataType.Text => ContentType.TextPlain,
            WebPubSubDataType.Json => ContentType.ApplicationJson,
            WebPubSubDataType.Binary => ContentType.ApplicationOctetStream,
            _ => throw new InvalidEnumArgumentException("DataType", (int)dataType, typeof(WebPubSubDataType))
        };

        private class ResponseClassifierOverridePolicy : HttpPipelinePolicy
        {
            private readonly ResponseClassifier _responseClassifier;

            public ResponseClassifierOverridePolicy(ResponseClassifier responseClassifier)
            {
                _responseClassifier = responseClassifier;
            }

            public override void Process(HttpMessage message, ReadOnlyMemory<HttpPipelinePolicy> pipeline)
            {
                message.ResponseClassifier = _responseClassifier;
                ProcessNext(message, pipeline);
            }

            public override async ValueTask ProcessAsync(HttpMessage message, ReadOnlyMemory<HttpPipelinePolicy> pipeline)
            {
                message.ResponseClassifier = _responseClassifier;
                await ProcessNextAsync(message, pipeline).ConfigureAwait(false);
            }
        }

        private class ResponseClassifier202Ignore429 : StatusCodeClassifier
        {
            // https://github.com/Azure/azure-sdk-for-net/blob/Azure.Messaging.WebPubSub_1.2.0/sdk/webpubsub/Azure.Messaging.WebPubSub/src/Generated/WebPubSubServiceClient.cs#L1469
            public ResponseClassifier202Ignore429() : base(stackalloc ushort[] { 202 }) { }

            public override bool IsRetriableResponse(HttpMessage message)
            {
                if (message.Response.Status == 429)
                {
                    return false;
                }

                return base.IsRetriableResponse(message);
            }
        }
    }
}
