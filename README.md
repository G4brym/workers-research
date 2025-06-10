# workers-research

**A serverless, Cloudflare Workers-based Deep Research Agent powered by Google Gemini 2.5.**

[![GitHub stars](https://img.shields.io/github/stars/G4brym/workers-research?style=social)](https://github.com/G4brym/workers-research/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/G4brym/workers-research/blob/main/LICENSE)

## ✨ Features

- **Deep Research Capabilities:** Conduct in-depth research on any topic you can imagine.
- **Powered by Google Gemini 2.5:** Leverages the advanced reasoning and language capabilities of Google's latest models for high-quality research reports.
- **Serverless Architecture:** Runs entirely on Cloudflare Workers and Workflows, offering scalability, reliability, and cost-effectiveness.
- **User-Friendly Dashboard:** Built with Hono and JSX for a reactive and intuitive web interface to manage and view your researches.
- **No Prompt Compression Needed:** Takes advantage of Gemini 2.5's massive context window, simplifying the architecture and improving report quality.

## 🚀 Inspiration and Acknowledgements

This project is heavily inspired by the incredible work of [dzhng](https://github.com/dzhng) and their [deep-research](https://github.com/dzhng/deep-research) project. **A huge thank you and props to dzhng for creating the original concept and codebase that served as the foundation for workers-research.** This project adapts and reimagines the core ideas of deep-research to run seamlessly within the Cloudflare ecosystem, making it more accessible and easier to deploy.

## 💡 Key Differences from Deep-Research

- **Serverless First with Cloudflare Workers:** The original `deep-research` project is designed to run in Node.js or Docker environments. `workers-research` is built from the ground up for Cloudflare Workers.
- **Cloudflare Workflows for Reliability:** A significant enhancement is the use of Cloudflare Workflows to manage the research process. This ensures that even complex, multi-step research tasks are reliably completed.
- **Gemini 2.5 and Simplified Architecture:** Leveraging the extensive 2 million token context window and cost-effectiveness of Google Gemini 2.5, `workers-research` **omits prompt compression techniques** found in the original project. This simplifies the codebase, potentially improves report quality by providing more context to the model, and reduces complexity.
- **Free Browser Rendering:** `workers-research` utilizes Cloudflare's Browser Rendering, now available on the Workers Free plan with a generous 10 minutes of daily usage, eliminating the need for a paid Cloudflare subscription. This makes deployment more accessible while supporting features like web crawling for research.

## 🔍 Use Cases

- **Academic Research:** Quickly gather information and insights for academic papers, theses, and research projects.
- **Market Analysis:** Research industry trends, competitors, and market dynamics for business decisions.
- **Content Creation:** Generate comprehensive research for blog posts, articles, and educational content.
- **Product Development:** Explore user needs, technical solutions, and industry standards for new products.
- **Educational Projects:** Help students gather information on complex topics for projects and assignments.

## 🛠️ Technology Stack

- **Cloudflare Workers:** The core runtime environment for the application.
- **Cloudflare Workflows:** Manages the research process, ensuring reliable execution and persistence.
- **Cloudflare D1 Database:** Serverless SQL database to store research data, status, and results.
- **Browser Rendering:** Web crawling API used to gather information from the internet, now accessible on the Workers Free plan.
- **Google Gemini 2.5:** The cutting-edge language model from Google AI, responsible for generating research reports and insights.
- **Cloudflare AI Gateway:** Optional proxy for AI requests, providing caching and enhanced management capabilities.
- **Hono:** A lightweight web framework for Cloudflare Workers, used for building the dashboard and API endpoints.
- **workers-qb:** A lightweight query builder for Cloudflare D1, simplifying database interactions.

## 🚦 Getting Started

Follow these steps to set up and run `workers-research` on your Cloudflare account:

### Setup Steps

1. **Clone the Repository:**
   ```bash
   git clone git@github.com:G4brym/workers-research.git
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Cloudflare Login:**
   Authenticate with your Cloudflare account using Wrangler:
   ```bash
   wrangler login
   ```

4. **Create a Cloudflare D1 Database:**
   Create a D1 database in your Cloudflare dashboard or using Wrangler:
   ```bash
   wrangler d1 create workers-research
   ```
   **Important:** Replace `"replace-me"` in your `wrangler.toml` file with the `database_id` output from the command above.

	Database migrations are applied automatically.

5. **Deploy to Cloudflare Workers:**
   Deploy your worker to Cloudflare:
   ```bash
   wrangler deploy
   ```
   This will deploy your worker to `workers-research.{your-user}.workers.dev` (or your custom domain if configured).

6. **Set up API Keys:**
   - **Google AI Studio API Key:** Obtain from [https://aistudio.google.com](https://aistudio.google.com).
   - Upload API Keys into workers:
     ```bash
     npx wrangler secret put GOOGLE_API_KEY
     ```

7. **(Optional) Configure Cloudflare AI Gateway:**
   - Create an AI Gateway in your Cloudflare account dashboard.
   - Configure the gateway with your preferred settings.
   - Set the required environment variables:
     ```bash
     npx wrangler secret put AI_GATEWAY_NAME
     npx wrangler secret put AI_GATEWAY_ACCOUNT_ID
     ```
   - If your gateway has authentication enabled, also set the API key:
     ```bash
     npx wrangler secret put AI_GATEWAY_API_KEY
     ```

8. **Access the Dashboard:**
   Open your deployed worker URL (e.g., `https://workers-research.{your-user}.workers.dev`) in your browser to access the research dashboard.

## ✍️ Usage

1. **Create a New Research:**
   - On the dashboard homepage, you'll see a "Create New Research" section.
   - Enter your research query, desired depth, and breadth.
   - Click "Continue with creation".

2. **Answer Follow-up Questions:**
   - The application will generate follow-up questions to clarify your research intent.
   - Answer these questions to refine the research direction.
   - Click "Create new Research" to start the research workflow.

3. **Monitor Research Status:**
   - You can track the status of your researches on the dashboard.
   - Researches in progress will be marked as "Running".
   - Completed researches will be marked as "Complete".

4. **Read Research Reports:**
   - Once a research is complete, a "Read" button will appear next to it.
   - Click "Read" to view the generated research report in a nicely formatted HTML page.

5. **Re-run Researches:**
   - If you want to re-run a previous research, click the "🔄" button next to the research entry. This will create a new research based on the same query and parameters.

## 📊 Performance & Limitations

- **Research Time:** Most researches complete within 5-10 minutes, depending on complexity.
- **Research Depth:** Configure depth from 1-5, with higher values producing more comprehensive reports.
- **API Limits:** Be aware of Cloudflare and Google Gemini API limits when running multiple researches. Browser Rendering on the Workers Free plan is limited to 10 minutes of usage per day, sufficient for most research tasks.

## 💬 Community & Support

- **[GitHub Issues](https://github.com/G4brym/workers-research/issues):** Report bugs or suggest features
- **[Discussions](https://github.com/G4brym/workers-research/discussions):** Ask questions and share ideas
- **[Discord Community](https://discord.gg/example):** Join our community for real-time help

## 🖼️ Screenshots

Home page
![homepage](https://github.com/G4brym/workers-research/raw/main/assets/images/home.png)

New Research
![new-research](https://github.com/G4brym/workers-research/raw/main/assets/images/new-research.png)

Follow up questions
![follow-up-questions](https://github.com/G4brym/workers-research/raw/main/assets/images/follow-up-questions.png)

Reading a report
![research](https://github.com/G4brym/workers-research/raw/main/assets/images/report.png)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
