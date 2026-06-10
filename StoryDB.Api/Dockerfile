FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY StoryDB.Api/StoryDB.Api.csproj StoryDB.Api/
RUN dotnet restore StoryDB.Api/StoryDB.Api.csproj

COPY StoryDB.Api/ StoryDB.Api/
RUN dotnet publish StoryDB.Api/StoryDB.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_HTTP_PORTS=5282
EXPOSE 5282

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "StoryDB.Api.dll"]
