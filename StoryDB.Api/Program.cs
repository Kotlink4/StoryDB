using Serilog;
using StoryDB.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseStoryDbSerilog(builder.Configuration);
builder.Services.AddStoryDbApplication(builder.Configuration, builder.Environment);

var app = builder.Build();
app.Logger.LogInformation("StoryDB API bootstrapped in {Environment} environment.", app.Environment.EnvironmentName);

app.InitializeStoryDbDataStore();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseStoryDbRequestPipeline(builder.Configuration);
app.MapStoryDbOperationalEndpoints();
app.MapControllers();

try
{
    app.Logger.LogInformation("StoryDB API is running.");
    app.Run();
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
