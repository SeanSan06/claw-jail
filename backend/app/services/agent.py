import google.generativeai as genai
from typing import List
from app.schemas import AIResult, Item
from app.core.config import settings

# 1. Tell Gemini to use the API key from your .env file!
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

# 2. Load the smart model
model = genai.GenerativeModel('gemini-2.5-flash')

def generate_ai_responses(prompt: str, count: int = 1) -> List[AIResult]:
    """Generate REAL AI responses using Gemini."""
    
    # Safety check in case the .env file is missing
    if not settings.gemini_api_key:
        return [AIResult(id=1, text="Error: GEMINI_API_KEY is missing from the backend .env file!", metadata={"source": "error"})]

    results = []
    try:
        # 3. Send the user's prompt to Gemini!
        response = model.generate_content(prompt)
        
        # 4. Package the response up for React
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