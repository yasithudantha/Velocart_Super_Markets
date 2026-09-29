FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Copy csproj and restore as distinct layers
COPY ["velocart-system.API.csproj", "./"]
RUN dotnet restore "./velocart-system.API.csproj"
# Copy everything else and build
COPY . .
RUN dotnet publish "velocart-system.API.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
# Expose port 80 to match the container routing
EXPOSE 80
ENTRYPOINT ["dotnet", "velocart-system.API.dll"]
