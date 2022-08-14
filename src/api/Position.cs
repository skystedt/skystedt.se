using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.WebPubSub;
using Skystedt.Api.Extensions;
using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

#pragma warning disable IDE0060 // Remove unused parameter

namespace Skystedt.Api
{
    public class Position
    {
        private const string TableConnection = "CosmosTableConnectionString";
        private const string TableName = "Connections";

        private const string WebPubSubConnection = "WebPubSubConnectionString";
        private const string HubName = "position";

        private readonly record struct PositionModel(string Id, decimal X, decimal Y);

        // Websockets connection information for new clients
        [FunctionName($"{nameof(Position)}-{nameof(Negotiate)}")]
        public async Task<WebPubSubConnection> Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = $"{nameof(Position)}/negotiate/{{userId}}")] HttpRequest request,
            [ExtendedWebPubSub(Connection = WebPubSubConnection, Hub = HubName)] WebPubSubConnectionFactory connectionFactory,
            string userId)
        {
            return await connectionFactory.CreateConnection(userId);
        }

        // Update a clients data and inform other clients of the update
        [FunctionName($"{nameof(Position)}-{nameof(Update)}")]
        public async Task<ActionResult> Update(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/update")] HttpRequest request,
            [ExtendedWebPubSub(Connection = WebPubSubConnection, Hub = HubName)] IAsyncCollector<WebPubSubAction> webpubsub,
            [Table(TableName, Connection = TableConnection)] TableClient table)
        {
            var body = await JsonDeserializeStruct<PositionModel>(request.Body);
            var connectionId = body?.Id;
            if (string.IsNullOrEmpty(connectionId))
            {
                return new BadRequestResult();
            }

            await Database.Update(table, connectionId);

            var x = Math.Round(body!.Value.X, 2, MidpointRounding.AwayFromZero);
            var y = Math.Round(body!.Value.Y, 2, MidpointRounding.AwayFromZero);
            await PubSub.BroadcastMessage(webpubsub, PubSub.MessageType.Update, connectionId, x, y);

            return new OkResult();
        }

        // Callback from websockets service when a client connects
        [FunctionName($"{nameof(Position)}-Callback-{nameof(Connected)}")]
        public async Task Connected(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/callback/connected")] HttpRequest request,
            [WebPubSubContext] WebPubSubContext webpubsubContext,
            [ExtendedWebPubSub(Connection = WebPubSubConnection, Hub = HubName)] IAsyncCollector<WebPubSubAction> webpubsub,
            [Table(TableName, Connection = TableConnection)] TableClient table)
        {
            var connectionId = webpubsubContext.Request.ConnectionContext.ConnectionId;

            var ids = await Database.GetAll(table);
            await Database.Add(table, connectionId); // Add after querying to exclude own connection

            await PubSub.InitMessage(webpubsub, connectionId, ids);
            await PubSub.BroadcastMessage(webpubsub, PubSub.MessageType.Connect, connectionId);
        }

        // Callback from websockets service when a client disconnects
        [FunctionName($"{nameof(Position)}-Callback-{nameof(Disconnected)}")]
        public async Task Disconnected(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"{nameof(Position)}/callback/disconnected")] HttpRequest request,
            [WebPubSubContext] WebPubSubContext webpubsubContext,
            [ExtendedWebPubSub(Connection = WebPubSubConnection, Hub = HubName)] IAsyncCollector<WebPubSubAction> webpubsub,
            [Table(TableName, Connection = TableConnection)] TableClient table)
        {
            var connectionId = webpubsubContext.Request.ConnectionContext.ConnectionId;

            await Database.Remove(table, connectionId);

            await PubSub.BroadcastMessage(webpubsub, PubSub.MessageType.Disconnect, connectionId);
        }

        // Abuse protecton
        [FunctionName($"{nameof(Position)}-Callback-{nameof(Validate)}")]
        public HttpResponseMessage Validate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = $"{nameof(Position)}/callback/validate")] HttpRequest request,
            [WebPubSubContext] WebPubSubContext webpubsubContext)
        {
            return webpubsubContext.Response;
        }

        private static async Task<T?> JsonDeserializeStruct<T>(Stream stream)
            where T : struct
        {
            try
            {
                return await JsonSerializer.DeserializeAsync<T>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }
    }
}

#pragma warning restore IDE0060 // Remove unused parameter
