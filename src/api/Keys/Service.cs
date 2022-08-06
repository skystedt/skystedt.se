using Microsoft.Azure.WebJobs.Host.Config;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;

#pragma warning disable CS0618 // Type or member is obsolete
namespace AzureSystemKeys
{
    internal class Service
    {
        private class WebHost
        {
            // Beware of reflection

            private const string WebHostAssembly = "Microsoft.Azure.WebJobs.Script.WebHost";

            private readonly Assembly _assembly;

            public WebHost(IWebHookProvider webHookProvider)
            {
                _assembly = webHookProvider.GetType().Assembly;
                var assemblyName = _assembly.GetName().Name;
                if (assemblyName != WebHostAssembly)
                {
                    throw new TypeLoadException($"Wrong assembly: {assemblyName}, Expected: {WebHostAssembly}");
                }
            }

            private Type GetType(string name) => _assembly.GetType(name) ?? throw new TypeLoadException($"Could not load type: {name}");

            public Type ISecretManagerProviderType => GetType($"{WebHostAssembly}.ISecretManagerProvider");
            public Type ScriptSecretsType => GetType($"{WebHostAssembly}.ScriptSecretsType");

            public Func<string> GenerateSystemKeyValue
            {
                get
                {
                    // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/SecretGenerator.cs
                    const string MethodName = "GenerateSystemKeyValue";
                    var type = GetType($"{WebHostAssembly}.Security.SecretGenerator");
                    var method = type.GetMethod(MethodName, BindingFlags.Public | BindingFlags.Static) ?? throw new MissingMethodException($"Missing method: {MethodName}");
                    return () => (method.Invoke(null, null) as string)!;
                }
            }
        }

        private readonly IServiceProvider _serviceProvider;
        private readonly WebHost _webHost;

        public Service(IServiceProvider serviceProvider, IWebHookProvider webHookProvider)
        {
            _serviceProvider = serviceProvider;
            _webHost = new WebHost(webHookProvider);
        }

        private dynamic GetSecretManager()
        {
            // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/KeyManagement/ISecretManagerProvider.cs
            dynamic secretManagerProvider = _serviceProvider.GetRequiredService(_webHost.ISecretManagerProviderType);
            return secretManagerProvider.Current;
        }

        public async Task<(Dictionary<string, string> FunctionKeys, Dictionary<string, string> SystemKeys)> GetKeys()
        {
            try
            {
                var secretManager = GetSecretManager();

                // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/KeyManagement/ISecretManager.cs
                var hostSecrets = await secretManager.GetHostSecretsAsync();

                // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/KeyManagement/HostSecretsInfo.cs
                var functionKeys = hostSecrets.FunctionKeys as Dictionary<string, string> ?? new Dictionary<string, string>();
                var systemKeys = hostSecrets.SystemKeys as Dictionary<string, string> ?? new Dictionary<string, string>();
                return (functionKeys, systemKeys);
            }
            catch (Exception? e)
            {
                var errors = new Dictionary<string, string>();
                var i = 0;
                while (e != null)
                {
                    var trace = JsonSerializer.Serialize(e.StackTrace);

                    errors.Add($"message{i}", e.Message);
                    errors.Add($"trace{i}", trace);

                    e = e.InnerException;
                    i++;
                }
                return (errors, errors);
            }
        }

        public readonly record struct SystemKeyStatus(string? Status, string SystemKey);
        public async Task<SystemKeyStatus> UpdateSystemKey(string keyName)
        {
            if (string.IsNullOrEmpty(keyName))
            {
                throw new ArgumentException($"'{nameof(keyName)}' cannot be null or empty.", nameof(keyName));
            }
            keyName = keyName.ToLowerInvariant();

            var generatedSecret = _webHost.GenerateSystemKeyValue();

            // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/KeyManagement/HostKeyScopes.cs
            const string HostKeyScopes_SystemKeys = "systemkeys";

            // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/Security/KeyManagement/ScriptSecretsType.cs
            dynamic scriptSecretsType_Host = Enum.Parse(_webHost.ScriptSecretsType, "Host");

            // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/WebHooks/DefaultScriptWebHookProvider.cs#L82
            var secretManager = GetSecretManager();
            var result = await secretManager.AddOrUpdateFunctionSecretAsync(keyName, generatedSecret, HostKeyScopes_SystemKeys, scriptSecretsType_Host);

            // https://github.com/Azure/azure-functions-host/blob/v4.5.2/src/WebJobs.Script.WebHost/OperationResult.cs
            var operationResult = result.Result.ToString() as string;

            return new(operationResult, generatedSecret);
        }
    }
}
#pragma warning restore CS0618 // Type or member is obsolete
