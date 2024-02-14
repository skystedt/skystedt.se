using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Skystedt.Api.Test.Implementations;

public class TestLogger<T>(ITestOutputHelper output) : ILogger<T>, IDisposable
{
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        output.WriteLine(state?.ToString());
    }

    public bool IsEnabled(LogLevel logLevel) => true;

    public IDisposable BeginScope<TState>(TState state) => this;

    public void Dispose()
    {
    }
}
