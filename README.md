# 🌾 Fasal Saathi: Precision Agriculture & Epidemiological Simulation 

**Fasal Saathi** is an AI-powered, intelligent crop disease diagnosis and predictive simulation platform built for precision agriculture. Designed with smallholder farmers, agronomists, and agricultural researchers in mind, this platform leverages Zero-Shot machine learning models and dynamic geospatial data to not only identify crop diseases in real-time but also project their potential spread based on live weather telemetry.

Built as a submission for the **Google Solution Challenge 2026**, Fasal Saathi bridges the gap between lab-grade AI and actionable field decision support, democratizing access to phytopathological analysis. 

---

## 🎯 The Core Concept & Impact

Traditional disease detection relies heavily on manual inspection by experts, which is often inaccessible and delayed, leading to massive crop loss. 

Fasal Saathi disrupts this by providing rapid, edge-optimized diagnosis and predictive intelligence:
* **Zero-Shot Disease Identification:** Utilizing a locally hosted OpenAI CLIP Vision Model, the backend analyzes plant leaf images instantly, detecting diseases with high accuracy even without extensive fine-tuning.
* **Epidemiological Heatmaps:** By fetching live weather metrics (wind speed, wind direction, humidity, and temperature) and binding them to an interactive `react-leaflet` map, the system visually simulates the projected spread of airborne or weather-driven pathogens across agricultural belts (such as the Rahuri MPKV sugarcane zone in Ahmednagar).
* **Actionable Agronomy:** Rather than generic advice, the system correlates detected diseases with precise agro-chemical interventions (fungicides, pesticides, fertilizers) to immediately stop the spread.
* **Multilingual Accessibility:** The UI is designed to be fully accessible in the field, utilizing the Web Speech API for dynamic Text-to-Speech (TTS) read-aloud functionality, ensuring critical mitigation steps are delivered seamlessly regardless of literacy barriers.

---

## 🛠️ Technology Stack

**Frontend Framework & UI**
* **Next.js & React (TypeScript):** Server-rendered, blazing-fast web framework.
* **Tailwind CSS:** For a responsive, accessible, mobile-first interface.
* **React-Leaflet:** Interactive geospatial mapping and dynamic polygon projection for spread simulation.
* **Vercel:** Optimized serverless edge hosting.

**Backend Architecture & AI**
* **FastAPI (Python):** High-performance, asynchronous REST API.
* **PyTorch & Hugging Face:** Loading the massive `openai/clip-vit-base-patch32` model in a local, offline environment to bypass rate limits.
* **Google Cloud Platform (Cloud Run):** Containerized heavy-ML backend deployment using Docker for enterprise-grade scalability. 

**State & Telemetry**
* **Supabase:** Remote environment database and authentication handler.
* **Web Speech API:** In-browser accessibility layer.
* **System Logging:** Global application state tracking for map viewport changes, API calls, and TTS activations.

---

## 🚀 How to Run the Project Locally

Fasal Saathi utilizes a decoupled architecture. To run this project locally, you must spin up both the Next.js frontend and the PyTorch backend.
### 1. Backend Setup (FastAPI & PyTorch)
Navigate to the `backend` directory and install the necessary Python dependencies. Note: The Zero-Shot CLIP model weights (~600MB) will be downloaded on the first run and cached locally.

```bash
# Move into the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on http://localhost:8000)
uvicorn main:app --reload
```

### 2. Frontend Setup (Next.js)
Open a new terminal window, navigate to the `frontend` directory, and launch the UI. Ensure you have your `.env.local` configured with your Supabase keys and LocalTunnel routing if testing live API access.

```bash
# Move into the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the development server (runs on http://localhost:3000)
npm run dev
```

### 3. Simulating Live Traffic (LocalTunnel)
If you need to bypass standard localhost limitations (like Vercel UI previews trying to hit the local AI model), use LocalTunnel to securely route web traffic to your Python server:

```bash
# In a fresh terminal, expose port 8000
npx localtunnel --port 8000
```

*Copy the generated `.loca.lt` URL and add it to your Frontend's `.env.local` as `NEXT_PUBLIC_API_URL` to connect the pipeline!*
