from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.files import router as files_router

app = FastAPI(title="videocompressorbutsimple")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(files_router, prefix="/api")
