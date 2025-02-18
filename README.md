# workers-research

**A serverless, Cloudflare Workers-based Deep Research Agent powered by Google Gemini 2.0 and Firecrawl.**

## ✨ Features

- **Deep Research Capabilities:** Conduct in-depth research on any topic you can imagine.
- **Powered by Google Gemini 2.0:** Leverages the advanced reasoning and language capabilities of Google's latest models
  for high-quality research reports.
- **Web Crawling with Firecrawl:** Utilizes Firecrawl to efficiently gather information from the web.
- **Serverless Architecture:** Runs entirely on Cloudflare Workers and Workflows, offering scalability, reliability, and
  cost-effectiveness.
- **Persistent Research with Cloudflare Workflows:** Ensures research tasks are completed reliably, for long-running
  processes.
- **User-Friendly Dashboard:**  Built with Hono and JSX for a reactive and intuitive web interface to manage and view
  your researches.
- **Easy Deployment:** Deployable to a Cloudflare free tier account, making it accessible to everyone.
- **No Prompt Compression Needed:** Takes advantage of Gemini 2.0's massive context window, simplifying the architecture
  and improving report quality.

## 🚀 Inspiration and Acknowledgements

This project is heavily inspired by the incredible work of [dzhng](https://github.com/dzhng) and
their [deep-research](https://github.com/dzhng/deep-research) project.  **A huge thank you and props to dzhng for
creating the original concept and codebase that served as the foundation for workers-research.**  This project adapts
and reimagines the core ideas of deep-research to run seamlessly within the Cloudflare ecosystem, making it more
accessible and easier to deploy.

## 💡 Key Differences from Deep-Research

- **Serverless First with Cloudflare Workers:**  The original `deep-research` project is designed to run in Node.js or
  Docker environments. `workers-research` is built from the ground up for Cloudflare Workers.
- **Cloudflare Workflows for Reliability:**  A significant enhancement is the use of Cloudflare Workflows to manage the
  research process. This ensures that even complex, multi-step research tasks are reliably completed.
- **Gemini 2.0 and Simplified Architecture:**  Leveraging the extensive 2 million token context window and
  cost-effectiveness of Google Gemini 2.0, `workers-research` **omits prompt compression techniques** found in the
  original project. This simplifies the codebase, potentially improves report quality by providing more context to the
  model, and reduces complexity.
- **Free Tier Deployment:**  `workers-research` is designed to be deployable on a free Cloudflare account. The free
  tiers of Cloudflare Workers, Workflows, D1 Database, and the generous free usage of Google AI Studio and Firecrawl (
  for initial exploration) make this project highly accessible without upfront costs.

## 🛠️ Technology Stack

- **Cloudflare Workers:**  The core runtime environment for the application.
- **Cloudflare Workflows:**  Manages the research process, ensuring reliable execution and persistence.
- **Cloudflare D1 Database:**  Serverless SQL database to store research data, status, and results.
- **Firecrawl:**  Web crawling API used to gather information from the internet.
- **Google Gemini 2.0:**  The cutting-edge language model from Google AI, responsible for generating research reports
  and insights.
- **Hono:**  A lightweight web framework for Cloudflare Workers, used for building the dashboard and API endpoints.
- **workers-qb:**  A lightweight query builder for Cloudflare D1, simplifying database interactions.


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
   **Important:**  Replace `"replace-me"` in your `wrangler.toml` file with the `database_id` output from the command
   above.

5. **Apply Database Migrations:**
   Apply D1 database migrations using Wrangler:
   ```bash
   wrangler d1 migrations apply DB --remote
   ```

6. **Deploy to Cloudflare Workers:**
   Deploy your worker to Cloudflare:
   ```bash
   wrangler deploy
   ```
   This will deploy your worker to `workers-research.{your-user}.workers.dev` (or your custom domain if configured).

7. **Set up API Keys:**
	- The free tier from both google and firecrawl is more than enough for this
	- **Google AI Studio API Key:** [https://aistudio.google.com](https://aistudio.google.com).
	- **Firecrawl API Key:** [https://www.firecrawl.dev/](https://www.firecrawl.dev/).

	- Upload API Keys into workers:

	  ```bash
      npx wrangler secret put GOOGLE_API_KEY
      npx wrangler secret put FIRECRAWL_API_KEY
	  ```

8. **Access the Dashboard:**
   Open your deployed worker URL (e.g., `https://workers-research.{your-user}.workers.dev`) in your browser to access the research
   dashboard.

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
	- If you want to re-run a previous research, click the "🔄" button next to the research entry. This will create a new
	  research based on the same query and parameters.


## Images

Home page
![homepage](https://github.com/G4brym/workers-research/raw/main/assets/images/home.png)

New Research follow up questions
![homepage](https://github.com/G4brym/workers-research/raw/main/assets/images/new-research.png)

Reading a report
![homepage](https://github.com/G4brym/workers-research/raw/main/assets/images/report.png)


## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
