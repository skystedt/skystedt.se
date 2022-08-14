using Azure;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.WebPubSub;
using Microsoft.Azure.WebPubSub.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Skystedt.Api
{
    internal static class PubSub
    {
        public enum MessageType
        {
            Connect,
            Disconnect,
            Init,
            Update
        }

        public static async Task BroadcastMessage(IAsyncCollector<WebPubSubAction> webpubsub, MessageType type, string connectionId, decimal? x = null, decimal? y = null)
        {
            var message = new SendToAllAction
            {
                Data = SerializeMessageData(new
                {
                    Type = type.ToString(),
                    Id = HashConnectionId(connectionId),
                    x,
                    y
                }),
                DataType = WebPubSubDataType.Json,
                Excluded = new List<string> { connectionId }
            };
            await Publish(webpubsub, message);
        }

        public static async Task InitMessage(IAsyncCollector<WebPubSubAction> webpubsub, string connectionId, IEnumerable<string> ids)
        {
            var message = new SendToConnectionAction
            {
                ConnectionId = connectionId,
                Data = SerializeMessageData(new
                {
                    Type = MessageType.Init.ToString(),
                    OwnId = connectionId,
                    Ids = ids.Select(HashConnectionId)
                }),
                DataType = WebPubSubDataType.Json
            };
            await Publish(webpubsub, message);
        }

        private static async Task Publish(IAsyncCollector<WebPubSubAction> webpubsub, WebPubSubAction message)
        {
            try
            {
                await webpubsub.AddAsync(message);
            }
            catch (RequestFailedException ex) when (ex.Status == 429)
            {
                // Don't throw
            }
        }

        private static string HashConnectionId(string connectionId)
        {
            return Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(connectionId)));
        }

        private static BinaryData SerializeMessageData<T>(T data)
        {
            return BinaryData.FromObjectAsJson(data, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        }
    }
}
