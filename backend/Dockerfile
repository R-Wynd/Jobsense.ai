# Backend container for Render / Fly / Railway / any Docker host.
FROM python:3.12-slim

# System libraries for weasyprint (PDF export). Safe to remove if you don't
# need the "Download PDF" feature.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
    libffi-dev shared-mime-info fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# python-jobspy = the scraper library (PyPI); weasyprint/markdown2 = PDF export.
RUN pip install --no-cache-dir -r requirements.txt python-jobspy weasyprint markdown2

COPY . .

# SQLite + generated resumes persist here. Mount a persistent disk at /data and
# set DATABASE_URL=sqlite:////data/jobsense.db so data survives redeploys.
RUN mkdir -p /data
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
