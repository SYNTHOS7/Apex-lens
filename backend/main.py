from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import analyse, batches, admin
import uvicorn

app = FastAPI(
    title="Apex Lens API",
    description="Backend API for customer feedback processing and sentiment analysis",
    version="1.0.0"
)

# Configure CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development and testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyse.router)
app.include_router(batches.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Apex Lens API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
