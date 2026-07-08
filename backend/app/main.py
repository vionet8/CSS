from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.core.database import init_db
from app.api import projects, content, images, characters, marketing, video, media, youtube, fprl


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Content Structure Studio API", version="0.1.0", lifespan=lifespan)

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
app.include_router(marketing.router)
app.include_router(video.router)
app.include_router(media.router)
app.include_router(youtube.router)
app.include_router(fprl.router)

_static = Path(__file__).parent.parent / "static"
if _static.exists():
    app.mount("/static", StaticFiles(directory=str(_static)), name="static")


@app.get("/health")
async def health():
    return {"status": "ok"}
