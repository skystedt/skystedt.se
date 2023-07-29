using Skystedt.Api.Functions;
using Skystedt.Api.Test.Implementations;

namespace Skystedt.Api.Test.Functions;

public class PingTests
{
    [Fact]
    public void PingReturnsDate()
    {
        // Arrange
        var sut = new Ping();
        var request = new TestHttpRequestData();

        // Act
        var response = sut.Get(request);

        // Assert
        var parsed = DateTimeOffset.TryParse(response, out _);
        Assert.True(parsed);
    }
}
