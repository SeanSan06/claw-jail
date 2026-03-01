import google.generativeai as genai
from typing import List
from app.schemas import AIResult, Item
from app.core.config import settings

# 1. Tell Gemini to use the API key from your .env file
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

# 2. Give the AI its personality and rules!
system_prompt = """
You are 'Clawbot', the AI security assistant for the 'Claw Jail' application.
Claw Jail is a high-security tool that monitors AI agents and manages file system permissions.
Users will ask you to change security modes (Safe, Flexible, Aggressive, Custom) or ask about system logs.
Your job is to acknowledge their requests in-character as a helpful, slightly technical security monitor. 
Keep your answers brief (1-2 sentences). 
Never say you 'cannot directly activate' something, because the backend system handles the actual execution. Just confirm the user's intent.
"""

# 3. Load the smart model WITH the system instruction
model = genai.GenerativeModel(
    'gemini-2.5-flash',
    system_instruction=system_prompt
)

def generate_ai_responses(prompt: str, count: int = 1) -> List[AIResult]:
    """Generate REAL AI responses using Gemini."""
    
    if not settings.gemini_api_key:
        return [AIResult(id=1, text="Error: GEMINI_API_KEY is missing from the backend .env file!", metadata={"source": "error"})]

    results = []
    try:
        # Send the user's prompt to Gemini
        response = model.generate_content(prompt)
        
        # Package the response up for React
        results.append(AIResult(id=1, text=response.text, metadata={"source": "gemini"}))
        
    except Exception as e:
        results.append(AIResult(id=1, text=f"Gemini Error: {str(e)}", metadata={"source": "error"}))
        
    return results

def generate_fake_items(q: str, n: int = 3) -> List[Item]:
    """Return a small list of fake items derived from query q."""
    items: List[Item] = []
    for i in range(n):
        items.append(Item(id=i + 1, name=f"{q}-item-{i+1}", description=f"Fake item generated from '{q}'"))
    return items