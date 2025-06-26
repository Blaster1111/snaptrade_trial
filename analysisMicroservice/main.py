# main.py
from fastapi import FastAPI
from app.api.portfolio import router as portfolio_router

app = FastAPI()

# Include your router
app.include_router(portfolio_router)

# Entry point for development server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
