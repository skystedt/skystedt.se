using Microsoft.Azure.Functions.Worker.Core.FunctionMetadata;
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
