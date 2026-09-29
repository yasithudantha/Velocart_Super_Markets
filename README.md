# Velocart System

Welcome to Velocart! This is a comprehensive e-commerce platform built with ASP.NET Core, React, and Flutter.

## Release: Version 1.0 (Production Ready)
The Velocart platform is fully prepared for deployment.

### 🚀 Installation & Local Development

1. **Clone the repository:**
   `git clone https://github.com/your-org/velocart-system.git`
   `cd velocart-system`

2. **Environment Variables:**
   Rename `.env.example` to `.env` in the `velocart-system.API` directory and provide your actual database credentials and API keys.

3. **Backend & Database Migration:**
   Navigate to the API folder and apply the Entity Framework Core migrations to set up your PostgreSQL database:
   ```bash
   cd velocart-system.API
   dotnet ef database update
   dotnet run
   ```

4. **Frontend:**
   ```bash
   cd velocart-admin
   npm install
   npm run dev
   ```

5. **AI Service:**
   ```bash
   cd velocart-ai-service
   pip install -r requirements.txt
   python main.py
   ```

### ☁️ Hosting Instructions

- **Frontend (Netlify):** 
  Connect your GitHub repository to Netlify. Set the build command to `npm run build` and the publish directory to `dist` (or `build`). Add any necessary environment variables in the Netlify dashboard.
  
- **Backend & AI Service (Railway):**
  Create a new project in Railway and connect your GitHub repository. 
  - For the **.NET Backend**, Railway will automatically detect the Dockerfile. Provide the `DATABASE_URL` and `JWT_SECRET` in the Railway variables.
  - For the **AI Service**, create a separate Railway service pointing to the same repo, but specify the root directory as `velocart-ai-service`. Provide the necessary environment variables.
