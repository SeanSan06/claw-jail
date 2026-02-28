# claude-jail
A security tool for keeping track of what Clawbot is doing in real time

# How It Works
Claude-jail is a high-security middleware between the AI agent and the local system. It monitors AI's thoughts and action. It ensures the AI does not do anything malicious behind the user's back. 

The Security Pipeline

1. The OpenClaw interface, built with react, is the primary point, where user issues commands such as "fix this bug" or "run this command". 
2. Then the user command gets intercepted by gateway. You can think of the gateway as the middleman. This component's job is to manage the flow between the UI and the underlying agent. 
3. The Agent also known as then recieves this instruction from the gateway. As a result, it uses this to communicate with openai/chatgpt. ChatGPT will generate the logic for the action.
4. Before the agent executes this logic, it sends this information as a JSON to the proxy/shim. This is where the core "jail" mechanics work. 
5. The Shim will push every intended action towards the security dashboard, where it logs information. The security dashboard will then add a security rule if needed. An IT Manager will overlook this whole process with the Shim and the security dashboard. IT Manager will modify security dashboard as much as needed. 
6. Finally, once the action passes the gateway and the human-governed security rules, it finally reaches the Bash terminal for the final execution of running the command. 

