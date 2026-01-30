# Use official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONPATH /app
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Create storage directories if they don't exist
RUN mkdir -p storage/temp storage/processed storage/db storage/uploads

# Expose port 8000 for FastAPI
EXPOSE 8000

# The actual command will be handled by docker-compose (to distinguish between API and Worker)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
