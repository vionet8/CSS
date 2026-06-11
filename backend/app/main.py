from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.core.database import init_db
from app.api import projects, content, images, characters

app = FastAPI(title="Content Structure Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(content.router)
app.include_router(images.router)
app.include_router(characters.router)

_static = Path(__file__).parent.parent / "static"
if _static.exists():
    app.mount("/static", StaticFiles(directory=str(_static)), name="static")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}
