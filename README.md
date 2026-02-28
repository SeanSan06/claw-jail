# claude-jail
A security tool for keeping track of what Clawbot is doing in real time

# How It Works
Claude-jail is a high-security middleware between the AI agent and the local system. It monitors AI's thoughts and action. It ensures the AI does not do anything malicious behind the user's back. 

The Security Pipeline

    1. The user interacts with the OpenClaw interface (React Frontend)to issue commands such as "fix this bug" or "run this command" 
    2. Then the user command gets intercepted by gateway. You can think of the gateway as the middleman. This component's job is to manage the flow between the UI and the underlying agent. 
    3. The Agent also known as then recieves this instruction from the gateway. As a result, it uses this to communicate with openai/chatgpt. ChatGPT will generate the logic for the action.
    4. Before the agent executes this logic, it sends this information 