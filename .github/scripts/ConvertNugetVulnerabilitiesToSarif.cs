#:package Sarif.Sdk@5.5.0

using System.Text.Json.Nodes;
using Microsoft.CodeAnalysis.Sarif;

if (args.Length < 2)
{
    throw new Exception("Usage: <input-file> <package-level>...");
}

var inputPath = args[0];
var packageLevels = args[1..];

if (!File.Exists(inputPath))
{
    throw new Exception($"Missing file: {inputPath}");
}
var inputText = File.ReadAllText(inputPath);
var report = JsonNode.Parse(inputText) ?? throw new Exception($"Invalid report: {inputPath}");

var results = (report["projects"]?.AsArray() ?? [])
    .SelectMany(project => (project?["frameworks"]?.AsArray() ?? [])
    .SelectMany(framework => packageLevels
    .SelectMany(level => (framework?[level]?.AsArray() ?? [])
    .SelectMany(package => (package?["vulnerabilities"]?.AsArray() ?? [])
    .Select(vulnerability => CreateResult(project, framework, package, vulnerability))))))
    .ToList();

var run = CreateRun(results);
var sarifLog = new SarifLog { Runs = [run] };

var outputPath = Path.ChangeExtension(inputPath, ".sarif");
sarifLog.Save(outputPath);
Console.WriteLine($"Wrote {results.Count} result(s) to {outputPath}");

static Result CreateResult(JsonNode? project, JsonNode? framework, JsonNode? package, JsonNode? vulnerability)
{
    var advisoryUrl = (string?)vulnerability?["advisoryurl"] ?? "unknown-advisory";
    var severity = (string?)vulnerability?["severity"];

    var failureLevel = severity switch
    {
        "Critical" or "High" => FailureLevel.Error,
        "Moderate" => FailureLevel.Warning,
        _ => FailureLevel.Note
    };

    var id = (string?)package?["id"];
    var resolvedVersion = (string?)package?["resolvedVersion"];
    var frameworkName = (string?)framework?["framework"];
    var message = $"{id} {resolvedVersion} ({frameworkName}) has a {severity ?? "unknown"} severity vulnerability.";

    string lockFilePath;
    var path = (string?)project?["path"];
    if (path != null)
    {
        var workspace = Environment.GetEnvironmentVariable("GITHUB_WORKSPACE") ?? Directory.GetCurrentDirectory();
        var relativeDirectory = Path.GetDirectoryName(Path.GetRelativePath(workspace, path)) ?? string.Empty;
        lockFilePath = UriHelper.MakeValidUri(Path.Combine(relativeDirectory, "packages.lock.json"));
    }
    else
    {
        lockFilePath = "packages.lock.json";
    }
    var lockFileUri = new Uri(lockFilePath, UriKind.Relative);

    var result = new Result
    {
        RuleId = advisoryUrl,
        Level = failureLevel,
        Message = new Message { Text = message },
        Locations =
        [
            new Location
            {
                PhysicalLocation = new PhysicalLocation
                {
                    ArtifactLocation = new ArtifactLocation { Uri = lockFileUri }
                }
            }
        ]
    };
    return result;
}

static Run CreateRun(List<Result> results)
{
    var rules = results
        .Select(result => result.RuleId)
        .Distinct()
        .Select(id => new ReportingDescriptor { Id = id, ShortDescription = new MultiformatMessageString { Text = id } });

    var run = new Run
    {
        Tool = new Tool
        {
            Driver = new ToolComponent
            {
                Name = "dotnet-list-package-vulnerable",
                InformationUri = new Uri("https://learn.microsoft.com/dotnet/core/tools/dotnet-list-package"),
                Rules = [.. rules]
            }
        },
        Results = results
    };
    return run;
}
