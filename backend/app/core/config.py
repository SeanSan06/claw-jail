try:
    from pydantic_settings import BaseSettings
except Exception:
    from pydantic import BaseSettings  # type: ignore

class Settings(BaseSettings):
    app_name: str = "Claw Jail Backend"
    debug: bool = True

    # 👇 THIS IS THE LINE THAT WAS MISSING! 👇
    gemini_api_key: str | None = None

    # Distilled local assessor (Phase 2)
    use_distilled_assessor: bool = False
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:1b"
    ollama_timeout_ms: int = 700

    class Config:
        env_file = ".env"

settings = Settings()