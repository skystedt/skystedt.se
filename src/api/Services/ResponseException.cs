using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Hosting;
using System.Net;

namespace Skystedt.Api.Services
{
    public static class ResponseExceptionExtensions
    {
        public static IFunctionsWorkerApplicationBuilder AddResponseExceptions(this IFunctionsWorkerApplicationBuilder builder)
        {
            builder.UseMiddleware(async (context, next) =>
            {
                try
                {
                    await next();
                }
                catch (ResponseException ex)
                {
                    var handled = await SetResponseCode(context, ex.StatusCode);
                    if (!handled)
                    {
                        throw;
                    }
                }
                catch (AggregateException ex) when (ex.InnerExceptions is [ResponseException rex])
                {
                    // Async functions will throw AggregateException
                    // https://github.com/Azure/azure-functions-dotnet-worker/issues/993
                    // Only handle AggregateException when ResponseException is the only inner exception

                    var handled = await SetResponseCode(context, rex.StatusCode);
                    if (!handled)
                    {
                        throw;
                    }
                }
            });
            return builder;
        }

        private static async Task<bool> SetResponseCode(FunctionContext context, HttpStatusCode statusCode)
        {
            const string SystemReturnParameterBindingName = "$return"; // Name when having single output binding

            // Only set an response when it will be handled by the host
            // https://github.com/Azure/azure-functions-dotnet-worker/issues/1151

            // HttpResponseData is used by several output bindings, we also need to check BindingType for "http"
            var httpOutputBinding = context.GetOutputBindings<HttpResponseData>().FirstOrDefault(b => b.BindingType == "http");

            if (httpOutputBinding != null)
            {
                var request = await context.GetHttpRequestDataAsync();
                if (request != null)
                {
                    var response = request.CreateResponse(statusCode);

                    if (httpOutputBinding.Name == SystemReturnParameterBindingName)
                    {
                        // Single binding output needs to set the response on the invocation result
                        var invocationResult = context.GetInvocationResult();
                        invocationResult.Value = response;
                    }
                    else
                    {
                        // Multi binding output needs to set the response on the http binding
                        // https://github.com/Azure/azure-functions-dotnet-worker/pull/1071
                        httpOutputBinding.Value = response;
                    }

                    return true;
                }
            }

            // Host cant handle a http response
            return false;
        }
    }

    public class ResponseException : Exception
    {
        public HttpStatusCode StatusCode { get; }

        public ResponseException(HttpStatusCode statusCode)
        {
            StatusCode = statusCode;
        }
    }
}
