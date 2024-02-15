namespace Skystedt.Api.Services;

public class User
{
    private static readonly long UserIdMaxNumberExclusive = (long)Math.Pow(10, 12); // 12 digits
    private const string UserIdPrefix = "User";

    public static string GenerateId()
    {
        var number = Random.Shared.NextInt64(UserIdMaxNumberExclusive);
        return $"{UserIdPrefix}_{number:D12}";
    }
}
