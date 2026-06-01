import os
import shutil
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List, Optional
from prompt.prompt import letter_prompt

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

BASE_DIR = Path(__file__).parent.parent

# Mount static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Setup templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Allow CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def start_page(request: Request):
    return templates.TemplateResponse(request, "index.html")

@app.get("/appeal", response_class=HTMLResponse)
async def appeal_page(request: Request):
    return templates.TemplateResponse(request, "app.html")

@app.post("/submit")
async def generate_letter(
    company: str = Form(...),
    disputeType: str = Form(...),
    complaint: str = Form(...),
    amount: Optional[int] = Form(None),
    tone: str = Form(default="Firm and Professional"),
    # By changing this to = File(None), the files field becomes completely optional
    files: Optional[List[UploadFile]] = File(None)
):

    uploaded_files = []
    temp_dir = "./temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        if files:
            for file in files:
                temp_file_path = os.path.join(temp_dir, file.filename)
                with open(temp_file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                gemini_file = client.upload_file(path=temp_file_path, mimetype=file.content_type)
                uploaded_files.append(gemini_file)
                os.remove(temp_file_path)
        
        evidence_instructions = (
            "Analyze the attached evidence files to verify if they support the user's complaint." 
            if uploaded_files else 
            "No supporting files were provided, so rely strictly on the text parameters provided."
        )

        prompt = letter_prompt(company, disputeType, complaint, amount, tone, evidence_instructions)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            content=[prompt] + uploaded_files # Attach files to the prompt if they exist,
        )

        return {
            "drafted_letter": response.text,
        }

    except Exception as e:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))
