using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using StoryDB.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("StoryDbClient", policy =>
    {
        policy
            .WithOrigins("http://localhost:50201", "http://127.0.0.1:50201")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddDbContext<StoryDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("StoryDb")
        ?? throw new InvalidOperationException("Connection string 'StoryDb' was not found.");
    options.UseNpgsql(connectionString);
});
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
    dbContext.Database.Migrate();
}
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("StoryDbClient");

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
});

app.UseAuthorization();

app.MapControllers();

app.Run();
