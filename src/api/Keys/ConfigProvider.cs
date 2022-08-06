using Microsoft.Azure.WebJobs.Description;
using Microsoft.Azure.WebJobs.Host.Bindings;
using Microsoft.Azure.WebJobs.Host.Config;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AzureSystemKeys
{
    [Extension("SystemKeys")]
    internal class ConfigProvider : IExtensionConfigProvider
    {
        private readonly Service _service;

        public ConfigProvider(Service service)
        {
            _service = service;
        }

        public void Initialize(ExtensionConfigContext context)
        {
            context.AddBindingRule<SystemKeyAttribute>().BindToInput(BuildItemFromAttr);
            context.AddBindingRule<SystemKeysAttribute>().BindToInput(BuildItemFromAttr);
            context.AddBindingRule<FunctionKeysAttribute>().BindToInput(BuildItemFromAttr);
        }

        private async Task<string?> BuildItemFromAttr(SystemKeyAttribute attribute, ValueBindingContext context)
        {
            var keys = await _service.GetKeys();
            return keys.SystemKeys.TryGetValue(attribute.KeyName, out var systemKey) ? systemKey : null;
        }

        private async Task<Dictionary<string, string>> BuildItemFromAttr(SystemKeysAttribute attribute, ValueBindingContext context)
        {
            var (_, systemKeys) = await _service.GetKeys();
            return systemKeys;
        }

        private async Task<Dictionary<string, string>> BuildItemFromAttr(FunctionKeysAttribute attribute, ValueBindingContext context)
        {
            var (functionKeys, _) = await _service.GetKeys();
            return functionKeys;
        }
    }
}
