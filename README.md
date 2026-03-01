# claude-jail
A security tool for keeping track of what Clawbot is doing in real time

# How It Works
Claude-jail is a high-security middleware between the AI agent and the local system. It monitors AI's thoughts and action. It ensures the AI does not do anything malicious behind the user's back. 

The Security Pipeline

1. The OpenClaw interface, built with react, is the primary point, where user issues commands such as "fix this bug" or "run this command". 
2. All commands get intercepted by the gateway aka the middleman. This component's job is to manage the flow between the UI and the underlying agent. 
3. The Agent also known as then recieves this instruction from the gateway. It then asks the llm to generate the logic behind the command. 
4. Before the agent executes this logic, it sends this information as a JSON to the proxy/shim. This is where the core "jail" mechanics work. 
5. The Shim will push every intended action towards the security dashboard, where it logs information. The security dashboard will then add a security rule to prevent the command from doing something its not suppose to do. An IT Manager will overlook this whole process with the Shim and the security dashboard. IT Manager will modify security dashboard as needed.. 
6. Finally, once the action passes the gateway and the human-governed security rules, it finally reaches the Bash terminal for the final execution of running the command. 

## Frontend Setup & Development (React + Vite)
### Installing Dependencies
To install all frontend dependencies, navigate to the frontend directory and run:

```bash
cd frontend
npm install
```

### Running the Development Server
Start the local development server with:

```bash
npm run dev
```

#  Faster-whisper start up guide

## Terminal 1: Start the Backend (The Brain 🧠)

Open your first terminal window and run these commands one by one to start the Python server and Faster Whisper:

```bash
# 1. Go to the backend folder
cd ~/PersonalProjects/"Irvinehacks 2026"/claude-jail/backend

# 2. Activate the virtual environment
source .venv/bin/activate

# 3. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


The application will be available at `http://localhost:5173` (Vite's default port).
