from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int = 8000
    PATIENT_SERVICE_URL: str = "http://localhost:3002"
    INTERNAL_SECRET: str = "change_this_to_a_long_random_string"
    MODEL_DIR: str = "./models/weights"
    DEVICE: str = "cpu"

    # HuggingFace token สำหรับเรียก HF Space ของทีม (external bone-age model)
    # ว่าง = เรียกแบบ anonymous (โดน rate limit ง่ายกว่า)
    HF_TOKEN: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
