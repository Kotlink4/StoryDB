namespace StoryDB.E2E.Tests;

[Parallelizable(ParallelScope.Self)]
[TestFixture]
public class StoryDbSmokeTests
{
    [Test]
    public void PlaywrightSmokeSuite_CoversStoryDbRoutes()
    {
        var specPath = Path.GetFullPath(Path.Combine(
            TestContext.CurrentContext.TestDirectory,
            "..",
            "..",
            "..",
            "tests",
            "storydb.smoke.spec.ts"));
        var spec = File.ReadAllText(specPath);

        Assert.Multiple(() =>
        {
            Assert.That(spec, Does.Contain("/style-preview"));
            Assert.That(spec, Does.Contain("/style-preview/profile"));
            Assert.That(spec, Does.Contain("/style-preview/settings"));
            Assert.That(spec, Does.Contain("/style-preview/projects/1/database/characters"));
        });
    }

    [Test]
    public void PlaywrightConfig_UsesLocalStoryDbBaseUrlByDefault()
    {
        var configPath = Path.GetFullPath(Path.Combine(
            TestContext.CurrentContext.TestDirectory,
            "..",
            "..",
            "..",
            "playwright.config.ts"));
        var config = File.ReadAllText(configPath);

        Assert.That(config, Does.Contain("STORYDB_E2E_BASE_URL"));
        Assert.That(config, Does.Contain("http://localhost:50201"));
    }
}
