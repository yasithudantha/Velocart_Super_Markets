# Velocart System

Welcome to Velocart! This is a comprehensive e-commerce platform built with ASP.NET Core, React, and Flutter.

## Current Stage: Continuous Integration (CI)
In this stage, our team has integrated automated checks using GitHub Actions. 
- A `.github/workflows/ci.yml` pipeline has been added.
- The pipeline automatically triggers `dotnet build` on every push and pull request to the `main` branch.

*Note: Known logical issues from the previous stage (auth validation, discount hardcoding) are currently tracked in GitHub Issues and will be fixed in the next sprint.*

