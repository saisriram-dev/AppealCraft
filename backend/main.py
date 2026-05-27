from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from .models import QueryModel -> Will be implemented later for handling query data

app = FastAPI()

# Allow CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    # Home page
    pass

@app.post("/login")
def login():
    # Handle user login
    pass
