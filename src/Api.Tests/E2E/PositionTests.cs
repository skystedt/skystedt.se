using Microsoft.Azure.Functions.Worker.Http;
using Skystedt.Api.Functions;
using Skystedt.Api.Test.Helpers;
using Skystedt.Api.Test.Implementations;
using Xunit.Abstractions;

namespace Skystedt.Api.Test.E2E;

public class PositionTests(ITestOutputHelper output)
{
    private static readonly TimeSpan TestUpdateInterval = TimeSpan.FromMilliseconds(500); // Use a low value to avoid having to wait too long while testing

    private readonly Func<List<MessageList>, List<MessageList>, bool> _compareMessages = new PubSubMessages(output).CompareMessages;

    private async Task<(
        Position Function,
        List<MessageList> Messages,
        CallbackPubSub.ClientConnect ClientConnect,
        CallbackPubSub.ClientDisconnect ClientDisconnect
        )> Initialize()
    {
        Position function = default!; // Will be assigned before being called
        async Task Connected(HttpRequestData request) => await function.Connected(request);
        async Task Disconnected(HttpRequestData request) => await function.Disconnected(request);

        await using var database = new InMemoryDatabase();
        var pubsub = new CallbackPubSub(Connected, Disconnected);
        function = new Position(database, pubsub)
        {
            UpdateInterval = TestUpdateInterval,
            UpdateSkew = TimeSpan.Zero
        };

        return (function, pubsub.Messages, pubsub.ConnectClient, pubsub.DisconnectClient);
    }

    [Fact]
    public async Task SingleUser()
    {
        var (function, messages, clientConnect, clientDisconnect) = await Initialize();

        var negotiation = await function.Negotiate(new TestHttpRequestData());
        var user = negotiation.UserId;
        var token = negotiation.Token;
        var connection = await clientConnect(user);

        await Task.Delay(TestUpdateInterval);
        await function.Update(new TestHttpRequestData(new { Token = token, X = 1, Y = 2 }));

        await clientDisconnect(user, connection);

        List<MessageList> expected =
        [
            // ClientConnect
            [
                new(user, connection, new { Type = "Init", Ids = (List<string>)[] })
            ],
            [],

            // Update
            [
                new(user, connection, new { Type = "Update", Id = user, X = 1, Y = 2 })
            ],

            // ClientDisconnect
            []
        ];
        Assert.Equal(expected, messages, _compareMessages);
    }

    [Fact]
    public async Task TwoUsers()
    {
        var (function, messages, clientConnect, clientDisconnect) = await Initialize();

        var negotiation1 = await function.Negotiate(new TestHttpRequestData());
        var user1 = negotiation1.UserId;
        var token1 = negotiation1.Token;

        var negotiation2 = await function.Negotiate(new TestHttpRequestData());
        var user2 = negotiation2.UserId;
        var token2 = negotiation2.Token;

        var connection1 = await clientConnect(user1);
        var connection2 = await clientConnect(user2);

        await Task.Delay(TestUpdateInterval);
        await function.Update(new TestHttpRequestData(new { Token = token1, X = 1, Y = 2 }));
        await function.Update(new TestHttpRequestData(new { Token = token2, X = 3, Y = 4 }));

        await clientDisconnect(user1, connection1);
        await clientDisconnect(user2, connection2);

        List<MessageList> expected =
        [
            // ClientConnect 1
            [
                new(user1, connection1, new { Type = "Init", Ids = (List<string>)[] })
            ],
            [],

            // ClientConnect 2
            [
                new(user2, connection2, new { Type = "Init", Ids = (List<string>)[user1] })
            ],
            [
                new(user1, connection1, new { Type = "Connect", Id = user2 })
            ],

            // Update 1
            [
                new(user1, connection1, new { Type = "Update", Id = user1, X = 1, Y = 2 }),
                new(user2, connection2, new { Type = "Update", Id = user1, X = 1, Y = 2 })
            ],

            // Update 2
            [
                new(user1, connection1, new { Type = "Update", Id = user2, X = 3, Y = 4 }),
                new(user2, connection2, new { Type = "Update", Id = user2, X = 3, Y = 4 })
            ],

            // ClientDisconnect 1
            [
                new(user2, connection2, new { Type = "Disconnect", Id = user1 })
            ],

            // ClientDisconnect 2
            []
        ];
        Assert.Equal(expected, messages, _compareMessages);
    }

    [Fact]
    public async Task ConnectedUserConnectsAgain()
    {
        var (function, messages, clientConnect, clientDisconnect) = await Initialize();

        var negotiation1 = await function.Negotiate(new TestHttpRequestData());
        var user1 = negotiation1.UserId;
        var token1 = negotiation1.Token;

        var negotiation2 = await function.Negotiate(new TestHttpRequestData());
        var user2 = negotiation2.UserId;
        var token2 = negotiation2.Token;

        var user1_connection1 = await clientConnect(user1);
        var user2_connection1 = await clientConnect(user2);
        var user2_connection2 = await clientConnect(user2);

        await clientDisconnect(user1, user1_connection1);
        await clientDisconnect(user2, user2_connection1);
        await clientDisconnect(user2, user2_connection2);

        List<MessageList> expected = [
            // ClientConnect 1_1
            [
                new(user1, user1_connection1, new { Type = "Init", Ids = (List<string>)[] })
            ],
            [],

            // ClientConnect 2_1
            [
                new(user2, user2_connection1, new { Type = "Init", Ids = (List<string>)[user1] })
            ],
            [
                new(user1, user1_connection1, new { Type = "Connect", Id = user2 })
            ],

            // ClientConnect 2_2
            [
                new(user1, user1_connection1, new { Type = "Disconnect", Id = user2 }),
                new(user2, user2_connection2, new { Type = "Disconnect", Id = user2 }),
            ],
            [
                new(user2, user2_connection2, new { Type = "Init", Ids = (List<string>)[user1] })
            ],
            [
                new(user1, user1_connection1, new { Type = "Connect", Id = user2 })
            ],

            // ClientDisconnect 1_1
            [
                new(user2, user2_connection2, new { Type = "Disconnect", Id = user1 })
            ],

            // ClientDisconnect 2_1
            // None

            // ClientDisconnect 2_2
            []
        ];
        Assert.Equal(expected, messages, _compareMessages);
    }
}
