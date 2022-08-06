using Microsoft.Azure.WebJobs.Description;
using System;

namespace AzureSystemKeys
{
    [AttributeUsage(AttributeTargets.Parameter)]
    [Binding]
    public class SystemKeyAttribute : Attribute
    {
        public string KeyName { get; }

        public SystemKeyAttribute(string keyName)
        {
            KeyName = keyName;
        }
    }
}
