using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Skystedt.Api.Functions
{
    public class BrowserReporting
    {
        private const string ContentTypeReports = "application/reports+json";
        private const string ContentTypeCsp = "application/csp-report";

        [FunctionName($"{nameof(BrowserReporting)}-{nameof(Default)}")]
        public async Task<IActionResult> Default(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"report")] HttpRequest request,
            ILogger logger)
        {
            if (request.ContentType != ContentTypeReports)
            {
                logger.LogWarning("Unsupported report header: {Header}", request.ContentType);
                return new UnsupportedMediaTypeResult();
            }

            var report = await request.ReadAsStringAsync();
            logger.LogWarning("Browser report: {Report}", report); // Warning

            return new OkResult();
        }

        [FunctionName($"{nameof(BrowserReporting)}-{nameof(ContentSecurityPolicy)}")]
        public async Task<IActionResult> ContentSecurityPolicy(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = $"report/csp")] HttpRequest request,
            ILogger logger)
        {
            if (request.ContentType is not ContentTypeReports and not ContentTypeCsp)
            {
                logger.LogWarning("Unsupported Csp header: {Header}", request.ContentType);
                return new UnsupportedMediaTypeResult();
            }

            var report = await request.ReadAsStringAsync();
            logger.LogError("Csp violation: {Report}", report); // Error

            return new OkResult();
        }
    }
}
