using Microsoft.Azure.Functions.Worker.Core.FunctionMetadata;
using System.Collections.Immutable;
using System.Text.Json;

namespace Skystedt.Api.Test.Helpers;

public static class FunctionMetadataExtensions
{
    private const string DirectionIn = "In";
    private const string DirectionInOut = "InOut";
    private const string DirectionOut = "Out";

    public static List<(string Name, string Type, string Direction, string Raw)> InputBindings(this IFunctionMetadata metadata)
        => Bindings(metadata, DirectionIn, DirectionInOut);
    public static List<(string Name, string Type, string Direction, string Raw)> OutputBindings(this IFunctionMetadata metadata)
        => Bindings(metadata, DirectionOut, DirectionInOut);
    private record DeserializedBindingMetadata(string name, string type, string direction);
    private static List<(string Name, string Type, string Direction, string Raw)> Bindings(IFunctionMetadata metadata, params string[] directions) =>
        metadata.RawBindings
            ?.Select(binding => (
                Metadata: JsonSerializer.Deserialize<DeserializedBindingMetadata>(binding),
                Raw: binding))
            ?.Where(binding => binding.Metadata != null && directions.Contains(binding.Metadata.direction))
            ?.Select(binding => (binding.Metadata!.name, binding.Metadata!.type, binding.Metadata!.direction, binding.Raw))
            ?.ToList()
            ?? new List<(string Name, string Type, string Direction, string Raw)>();
}

public class FunctionMetadataProvider : IFunctionMetadataProvider
{
    private record DeserializedFunctionMetadata(string name, string scriptFile, string entryPoint, string language, List<JsonElement> bindings, DefaultRetryOptions? retry);
    public async Task<ImmutableArray<IFunctionMetadata>> GetFunctionMetadataAsync(string directory)
    {
        const string FileName = "functions.metadata";
        var path = Path.Combine(directory, FileName);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException("Function metadata not found", path);
        }

        await using var fs = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.Read);

        var metadata = await JsonSerializer.DeserializeAsync<List<DeserializedFunctionMetadata>>(fs) ?? throw new Exception("Failed to deserialize");
        var result = metadata
            .Select(m => (IFunctionMetadata)new DefaultFunctionMetadata
            {
                Name = m.name,
                ScriptFile = m.scriptFile,
                EntryPoint = m.entryPoint,
                Language = m.language,
                RawBindings = m.bindings.Select(binding => binding.ToString()).ToList(),
                Retry = m.retry
            })
            .ToImmutableArray();
        return result;
    }
}
