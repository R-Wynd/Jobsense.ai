from app.database import SessionLocal
from app.models import Job, PipelineRun
db = SessionLocal()
db.query(Job).delete()
db.query(PipelineRun).delete()
db.commit()
db.close()
print('Database cleared.')
