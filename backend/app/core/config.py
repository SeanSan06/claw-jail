try:
    from pydantic_settings import BaseSettings
except Exception:
    from pydantic import BaseSettings  # type: ignore


class Settings(BaseSettings):
    app_name: str = "Claw Jail Backend"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
