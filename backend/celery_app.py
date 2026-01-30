from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = os.getenv("REDIS_PORT", "6379")
redis_db = os.getenv("REDIS_DB", "0")
redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

# We import the task here to avoid circular imports
@celery_app.task(name="run_processing_task")
def run_processing_task(product_id: int, upload_path: str):
    # This task will be imported and implemented in main.py or a tasks.py
    # For now, we'll keep the logic in main.py and just use this as a wrapper
    from main import run_processing_sync
    run_processing_sync(product_id, upload_path)
