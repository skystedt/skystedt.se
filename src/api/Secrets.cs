using AzureSystemKeys;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Host.Config;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace FunctionSecrets
{
    public class Secrets
    {
        private readonly Assembly _assembly;

        public Secrets(IWebHookProvider webHookProvider)
        {
            _assembly = webHookProvider.GetType().Assembly;
        }

        [FunctionName("Keys1")]
        public Dictionary<string, string> Keys1(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "secrets/1")] HttpRequest req,
            [SystemKeys] Dictionary<string, string> systemKeys,
            ILogger logger)
        {
            var keys = string.Join(", ", systemKeys.Select(key => $"{key.Key}: {key.Value}"));
            logger.LogInformation("KEYS {keys}", keys);
            return systemKeys;
        }

        [FunctionName("Keys2")]
        public Dictionary<string, string> Keys2(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "secrets/2")] HttpRequest req,
            [FunctionKeys] Dictionary<string, string> functionKeys,
            ILogger logger)
        {
            var keys = string.Join(", ", functionKeys.Select(key => $"{key.Key}: {key.Value}"));
            logger.LogInformation("KEYS {keys}", keys);
            return functionKeys;
        }

        [FunctionName("SecretsTest")]
        public string Test(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "secrets/test")] HttpRequest req,
            ILogger logger)
        {
            var type = _assembly.GetType("Microsoft.Azure.WebJobs.Script.WebHost.Security.SecretGenerator")!;
            var method = type.GetMethod("GenerateMasterKeyValue", BindingFlags.Public | BindingFlags.Static)!;
            var value = method.Invoke(null, null) as string;
            return value!;
        }
    }
}
