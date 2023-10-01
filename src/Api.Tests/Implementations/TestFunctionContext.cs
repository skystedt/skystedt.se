using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;

namespace Skystedt.Api.Test.Helpers;

public class TestFunctionContext : FunctionContext
{
    private static readonly IServiceCollection Services = new ServiceCollection().AddFunctionsWorkerCore().Services;

    public override IServiceProvider InstanceServices { get; set; } = Services.BuildServiceProvider();

    public override string InvocationId { get => throw new NotImplementedException(); }
    public override string FunctionId { get => throw new NotImplementedException(); }
    public override TraceContext TraceContext { get => throw new NotImplementedException(); }
    public override BindingContext BindingContext { get => throw new NotImplementedException(); }
    public override RetryContext RetryContext { get => throw new NotImplementedException(); }
    public override FunctionDefinition FunctionDefinition { get => throw new NotImplementedException(); }
    public override IDictionary<object, object> Items { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
    public override IInvocationFeatures Features { get => throw new NotImplementedException(); }
}
