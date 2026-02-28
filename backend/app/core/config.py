from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Claw Jail Backend"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
