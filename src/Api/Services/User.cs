namespace Skystedt.Api.Services;

public class User
{
    public static string GenerateId()
    {
        const long UserIdMaxNumberExclusive = 1_000_000_000_000; // 12 digits
        var number = Random.Shared.NextInt64(UserIdMaxNumberExclusive);
        return $"User_{number:D12}";
    }
}
