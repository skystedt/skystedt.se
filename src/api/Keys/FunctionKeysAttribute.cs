using Microsoft.Azure.WebJobs.Description;
using System;

namespace AzureSystemKeys
{
    [AttributeUsage(AttributeTargets.Parameter)]
    [Binding]
    public class FunctionKeysAttribute : Attribute
    {
    }
}
