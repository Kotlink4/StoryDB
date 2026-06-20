using System.Globalization;
using System.Text;

namespace StoryDB.Api.Observability;

public static partial class PrometheusMetricsFormatter
{
    private static void AppendCounter(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string help,
        double value,
        params (string Key, string Value)[] labels)
    {
        AppendMetric(builder, emittedMetadata, name, "counter", help, value, labels);
    }

    private static void AppendGauge(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string help,
        double value,
        params (string Key, string Value)[] labels)
    {
        AppendMetric(builder, emittedMetadata, name, "gauge", help, value, labels);
    }

    private static void AppendMetric(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string type,
        string help,
        double value,
        IReadOnlyList<(string Key, string Value)> labels)
    {
        if (emittedMetadata.Add(name))
        {
            builder.Append("# HELP ").Append(name).Append(' ').AppendLine(help);
            builder.Append("# TYPE ").Append(name).Append(' ').AppendLine(type);
        }

        builder.Append(name);
        if (labels.Count > 0)
        {
            builder.Append('{');
            for (var index = 0; index < labels.Count; index += 1)
            {
                if (index > 0)
                {
                    builder.Append(',');
                }

                builder
                    .Append(labels[index].Key)
                    .Append("=\"")
                    .Append(EscapeLabelValue(labels[index].Value))
                    .Append('"');
            }

            builder.Append('}');
        }

        builder.Append(' ')
            .AppendLine(value.ToString("0.###", CultureInfo.InvariantCulture));
    }

    private static string EscapeLabelValue(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal);
}
