#:package YamlDotNet@16.3.0

using YamlDotNet.RepresentationModel;

if (args.Length == 0)
{
    throw new Exception("No argument");
}

var filePath = args[0];
if (!File.Exists(filePath))
{
    throw new Exception($"Missing file: {filePath}");
}

var directory = Path.GetDirectoryName(filePath) ?? string.Empty;
var yarnrcPath = Path.Combine(directory, ".yarnrc.yml");
if (!File.Exists(yarnrcPath))
{
    throw new Exception($"Missing file: {yarnrcPath}");
}

var sourceYaml = new YamlStream();
using var sourceReader = new StreamReader(yarnrcPath, new FileStreamOptions { Access = FileAccess.Read, Mode = FileMode.Open, Share = FileShare.ReadWrite });
sourceYaml.Load(sourceReader);
if (sourceYaml.Documents.Count == 0)
{
    throw new Exception($"Invalid Yarnrc {yarnrcPath}");
}

var additionalYaml = new YamlStream();
using var additionalReader = new StreamReader(filePath);
additionalYaml.Load(additionalReader);
if (additionalYaml.Documents.Count == 0)
{
    Console.WriteLine("Nothing to merge");
    return 0;
}

var sourceRoot = (YamlMappingNode)sourceYaml.Documents[0].RootNode;
var additionalRoot = (YamlMappingNode)additionalYaml.Documents[0].RootNode;
foreach (var (key, newValue) in additionalRoot.Children)
{
    var existingValue = sourceRoot.Children[key];
    if (existingValue is YamlSequenceNode existingSequence)
    {
        foreach (var newItem in (YamlSequenceNode)newValue)
        {
            existingSequence.Add(newItem);
        }
    }
    else
    {
        sourceRoot.Add(key, newValue);
    }
}

using var writer = new StreamWriter(yarnrcPath);
sourceYaml.Save(writer, assignAnchors: false);

Console.WriteLine("Merged");
return 0;
