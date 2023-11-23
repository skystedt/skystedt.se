using System.Collections;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Text.RegularExpressions;
using Xunit.Abstractions;

namespace Skystedt.Api.Test.Helpers;

public class MessageList : List<Message>
{
    public MessageList() : base() { }
    public MessageList(List<Message> collection) : base(collection) { }
}

public record Message(string UserId, string ConnectionId, object Data);

public class PubSubMessages(ITestOutputHelper output)
{
    public bool CompareMessages(List<MessageList> expected, List<MessageList> actual)
    {
        if (expected.Count != actual.Count)
        {
            output.WriteLine($"'List<MessageList>' count mismatch, Expected: {expected.Count}, Actual: {actual.Count}");
            return false;
        }

        for (var i = 0; i < expected.Count; i++)
        {
            if (expected[i].Count != actual[i].Count)
            {
                output.WriteLine($"'MessageList[{i}]' count mismatch, Expected: {expected[i].Count}, Actual: {actual[i].Count}");
                return false;
            }

            foreach (var expectedMessage in expected[i])
            {
                var equal = false;
                foreach (var actualMessage in actual[i])
                {
                    if (CompareMessage(expectedMessage, actualMessage))
                    {
                        equal = true;
                        break;
                    }
                }
                if (!equal)
                {
                    output.WriteLine($"'MessageList[{i}]' not equal");
                    return false;
                }
            }
        }

        return true;
    }

    public static bool CompareMessage(Message expected, Message actual)
    {
        const string AnonymousFieldName = "<([^>]+)>i__Field";
        [SuppressMessage("GeneratedRegex", "SYSLIB1045:Convert to 'GeneratedRegexAttribute'")]
        static Dictionary<string, FieldInfo> AnonymousFields(object data) =>
            data.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic)
                .Select(field => (FieldInfo: field, Regex: Regex.Match(field.Name, AnonymousFieldName)))
                .Where(field => field.Regex.Success && field.Regex.Groups.Count >= 2)
                .ToDictionary(field => field.Regex.Groups[1].Value, field => field.FieldInfo, StringComparer.OrdinalIgnoreCase);

        if (expected.UserId != actual.UserId)
        {
            return false;
        }

        if (expected.ConnectionId != actual.ConnectionId)
        {
            return false;
        }

        if (!ReferenceEquals(expected, actual))
        {
            if (expected.Data is null || actual.Data is null)
            {
                return false;
            }

            var expectedFields = AnonymousFields(expected.Data);
            var actualFields = AnonymousFields(actual.Data);

            foreach (var (fieldName, expectedField) in expectedFields)
            {
                if (!actualFields.TryGetValue(fieldName, out var actualField))
                {
                    return false;
                }

                var expectedValue = expectedField.GetValue(expected.Data);
                var actualValue = actualField.GetValue(actual.Data);

                var expectedType = expectedField.FieldType;
                var actualType = actualField.FieldType;

                if (!CompareField(expectedValue, actualValue, expectedType, actualType))
                {
                    return false;
                }
            }
        }

        return true;
    }

    public static bool CompareField(object? expected, object? actual, Type expectedType, Type actualType)
    {
        if (ReferenceEquals(expected, actual))
        {
            return true;
        }

        if (expected is null || actual is null)
        {
            return false;
        }

        if (Equals(expected, actual)) // Use 'Equals' instead of '==', to use type specific checks instead of reference check
        {
            return true;
        }

        if (typeof(IEnumerable).IsAssignableFrom(expectedType) && expected is not string)
        {
            if (!typeof(IEnumerable).IsAssignableFrom(actualType) || actual is string)
            {
                return false;
            }

            var actualCounter = ((IEnumerable)actual).GetEnumerator();
            foreach (var expectedCurrent in (IEnumerable)expected)
            {
                actualCounter.MoveNext();

                var equal = false;

                foreach (var actualCurrent in (IEnumerable)actual)
                {
                    if (CompareField(
                        expectedCurrent,
                        actualCurrent,
                        expectedCurrent?.GetType() ?? typeof(object),
                        actualCurrent?.GetType() ?? typeof(object)))
                    {
                        equal = true;
                        break;
                    }
                }

                if (!equal)
                {
                    return false;
                }
            }

            if (actualCounter.MoveNext())
            {
                // actual has more elements than expected
                return false;
            }

            return true;
        }

        var enumResult = (expectedType.IsEnum, actualType.IsEnum, expected is string, actual is string) switch
        {
            (true, true, _, _) => (long)expected == (long)actual,
            (true, _, _, true) => string.Equals(expectedType.GetEnumName(expected), (string)actual, StringComparison.OrdinalIgnoreCase),
            (_, true, true, _) => string.Equals((string)expected, actualType.GetEnumName(actual), StringComparison.OrdinalIgnoreCase),
            _ => null as bool?,
        };
        if (enumResult.HasValue)
        {
            return enumResult.Value;
        }

        try
        {
            if (Convert.ChangeType(expected, actualType).Equals(actual))
            {
                return true;
            }
        }
        catch { }

        return false;
    }
}
