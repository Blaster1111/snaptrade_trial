from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORFTOLIO_PILOT_APIKEY: str
    PORTFOLIO_PILOT_APIURL: str

    class Config:
        env_file = ".env"

settings = Settings()