using Skystedt.Api.Test.Helpers;

namespace Skystedt.Api.Test.Metadata;

public class FunctionBindingsTests
{
    private static string FunctionsDirectory() => Directory.GetCurrentDirectory().Replace(".Tests", string.Empty);

    [Fact]
    public async Task CanReadFunctionMetadata()
    {
        // Arrange
        // Functions project needs to be built and have generated 'functions.metadata'
        var functionMetadata = new FunctionMetadataProvider();
        var functionsDirectory = FunctionsDirectory();

        // Act
        var metadata = await functionMetadata.GetFunctionMetadataAsync(functionsDirectory);

        // Assert
        Assert.NotEmpty(metadata);
    }

    [Fact]
    public async Task HttpTriggersHasHttpResponseBindings()
    {
        // Functions with Http triggers must return a http response
        // Can be either a primitive, POCO, HttpResponseData or multi output containing a HttpResponseData
        // Otherwise it's not possible to set the response in middleware
        // https://github.com/Azure/azure-functions-dotnet-worker/issues/1151

        // Arrange
        // Functions project needs to be built and have generated 'functions.metadata'
        var functionMetadata = new FunctionMetadataProvider();
        var functionsDirectory = FunctionsDirectory();

        // Act
        var metadata = await functionMetadata.GetFunctionMetadataAsync(functionsDirectory);

        // Assert
        var httpTriggerFunctions = metadata.Where(m => m.InputBindings().Any(b => b.Type == "httpTrigger")).ToList();
        var httpResponseFunctions = metadata.Where(m => m.OutputBindings().Any(b => b.Type == "http")).ToList();
        Assert.Equal(httpTriggerFunctions, httpResponseFunctions);
    }

    [Fact]
    public async Task CanReadSourceGeneratedFunctionMetadata()
    {
        // Source generators for function metadata is not yet GA
        // https://github.com/Azure/azure-functions-dotnet-worker/milestone/65

        // Arrange
        var functionMetadata = new GeneratedFunctionMetadataProvider();
        var functionsDirectory = FunctionsDirectory();

        // Act
        var metadata = await functionMetadata.GetFunctionMetadataAsync(functionsDirectory);

        // Assert
        Assert.NotEmpty(metadata);
    }
}
