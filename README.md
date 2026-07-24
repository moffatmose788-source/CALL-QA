# CallIQ — Professional Call Quality Analysis System

A React application that:
1. Accepts a file (Excel or CSV) containing all agent call records
2. Randomly samples **5 calls per agent**
3. Auto-detects **English or Kiswahili** in each transcript
4. Scores each call against configurable weighted parameters
5. Generates AI coaching feedback
6. Exports scorecards as Excel or CSV

---

## Quick Start

### 1. Prerequisites
- Node.js 16 or higher → https://nodejs.org
- npm (comes with Node.js)

### 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Start the app
```
npm start
```
The app opens at http://localhost:3000

---

## Project structure

```
calliq/
├── public/
│   └── index.html              ← HTML shell
├── src/
│   ├── index.js                ← React entry point
│   ├── index.css               ← Global styles
│   ├── App.jsx                 ← Main shell + navigation
│   ├── components/
│   │   ├── UploadPage.jsx      ← File upload + column mapping
│   │   ├── PipelinePage.jsx    ← Sampling + scoring pipeline
│   │   ├── ResultsPage.jsx     ← Agent scorecards + call detail
│   │   ├── DashboardPage.jsx   ← Analytics charts + leaderboard
│   │   ├── ExportPage.jsx      ← Excel / CSV download
│   │   └── ParametersPage.jsx  ← Edit scoring parameters + weights
│   └── utils/
│       ├── scoring.js          ← Language detection, scoring, feedback
│       ├── export.js           ← Excel + CSV export
│       └── demoData.js         ← Demo dataset generator
└── package.json
```

---

## How to use

### Option A — Upload your own file
Your Excel or CSV must have these columns (names can vary — you map them):

| Column        | Required | Description                             |
|---------------|----------|-----------------------------------------|
| Agent Name    | ✅ Yes   | Full name of the agent                  |
| Call ID       | ✅ Yes   | Unique identifier for the call          |
| Transcript    | ✅ Yes   | Text of what was said in the call       |
| Customer Name | Optional | Name of the customer                    |
| Customer ID   | Optional | Customer account number                 |
| Date          | Optional | Date the call was made (YYYY-MM-DD)     |
| Balance       | Optional | Outstanding balance (e.g. KES 4,500)    |
| Product       | Optional | Product the call relates to             |

**Example row:**
```
Agent Name,Call ID,Transcript,Customer Name,Date
Moffat Odhiambo,C-1001,"Good morning my name is Moffat...",John Kamau,2025-06-15
```

### Option B — Load demo data
On the Upload page, click **"Load demo (5 agents · 400 calls each)"**.
This generates 2,000 call records across 5 agents with a realistic mix of English and Kiswahili transcripts at high, mid, and low quality.

---

## The pipeline (step by step)

1. **Upload** → system reads your file, detects agents and call counts
2. **Pipeline** → for each agent, picks 5 random calls from their full list
3. **Language detection** → scans transcript for Kiswahili words; if ≥2 matches → SW, else EN
4. **Scoring** → for each parameter, matches keywords against transcript and awards a weighted score
5. **Feedback** → generates a per-call coaching narrative naming gaps and strengths
6. **Export** → downloads Excel with one row per call and an agent summary sheet

---

## Scoring parameters (default)

| Parameter                  | Weight | What it checks                                |
|----------------------------|--------|-----------------------------------------------|
| Greeting & self-ID         | 20%    | Agent introduced themselves by name           |
| Account verification       | 20%    | Agent verified customer identity              |
| Purpose of call            | 15%    | Agent explained why they were calling         |
| Empathy & professional tone| 15%    | Agent showed understanding and respect        |
| Solution offered           | 15%    | Agent offered a payment plan or resolution    |
| Next steps communicated    | 10%    | Agent told customer what happens next         |
| Professional closing       | 5%     | Agent closed the call politely                |

Go to **Parameters** tab to edit names, weights, and keywords (English + Kiswahili separately).

---

## Status thresholds

| Range  | Status   | Meaning                            |
|--------|----------|------------------------------------|
| ≥ 70%  | Pass     | Agent meeting standard             |
| 55–69% | Coaching | Agent needs improvement            |
| < 55%  | Flagged  | Immediate coaching required        |

Thresholds are configurable in the Pipeline settings.

---

## Audio transcription (future step)

To analyze actual audio recordings instead of text transcripts:
1. Get an OpenAI API key from https://platform.openai.com
2. Send each audio file to the Whisper API (`/v1/audio/transcriptions`)
3. Use the returned text as the `Transcript` column in your file
4. Upload the resulting CSV to CallIQ as normal

---

## Connecting to your CRM / portal

To pull live customer data:
- Add a column `Customer ID` to your call records file
- Write a small script that calls your CRM API and enriches the CSV with customer names, balances, and product info before uploading
- CallIQ will include all those fields in the export

---

## Troubleshooting

**"No agents detected"** → Make sure your Agent Name column is mapped correctly on the Upload page.

**All scores are 0** → Check that your Transcript column contains actual call text, not just call metadata.

**Weights don't add to 100%** → Go to Parameters tab, adjust weights until the total shows 100%.

**Excel file won't open** → Try downloading the CSV version instead; it opens in any spreadsheet app.
