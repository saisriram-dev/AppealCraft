import os
import shutil
import uuid
import json
import re
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from google import genai
import traceback
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import JSONResponse
from fastapi import Request
from prompt.prompt import letter_prompt

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(
        status_code=429,
        content={
            "success": False,
            "message": "Too many requests. Please wait a minute and try again.",
        },
    ),
)

app.add_middleware(SlowAPIMiddleware)

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


# Changed to 'def' so FastAPI processes this blocking I/O request in a thread pool
@app.post("/submit")
@limiter.limit("5/minute")
def generate_letter(
    request: Request,
    company: str = Form(...),
    disputeType: str = Form(...),
    complaint: str = Form(...),
    amount: Optional[int] = Form(None),
    tone: str = Form(default="Firm and Professional"),
    files: Optional[List[UploadFile]] = File(None),
):
    uploaded_files = []

    # Isolate this specific request into its own folder using a unique UUID
    request_id = str(uuid.uuid4())
    temp_dir = os.path.join("./temp_uploads", request_id)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        if files:
            for file in files:
                # Skip over accidental empty payloads or unselected inputs
                if not file.filename:
                    continue

                temp_file_path = os.path.join(temp_dir, file.filename)

                # Safely copy uploaded file streams synchronously
                with open(temp_file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                # Send file payload to Gemini API
                gemini_file = client.upload_file(
                    path=temp_file_path, mimetype=file.content_type
                )
                uploaded_files.append(gemini_file)

        evidence_instructions = (
            "Analyze the attached evidence files to verify if they support the user's complaint."
            if uploaded_files
            else "No supporting files were provided, so rely strictly on the text parameters provided."
        )

        # 1. Force Gemini to output JSON with both keys clearly defined
        prompt = letter_prompt(
            company, disputeType, complaint, amount, tone, evidence_instructions
        )

        # 2. Request generation
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=[prompt] + uploaded_files,
        )

        raw_text = response.text
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)

        try:
            if match:
                data = json.loads(match.group(0))
            else:
                raise ValueError("No JSON found")

            letter_content = data.get("drafted_letter", "No letter found.")
            roadmap_content = data.get("escalation_roadmap") or data.get(
                "escalation_steps", []
            )
            confidence_score = data.get("confidence_score", None)

            print("DEBUG keys:", list(data.keys()))  # ← add
            print("DEBUG roadmap:", roadmap_content)

        except Exception as e:
            print(f"DEBUG: Parsing failed. Raw response: {raw_text}")
            letter_content = response.text
            roadmap_content = ["Error: Could not parse steps. Check console."]

        return {
            "drafted_letter": letter_content,
            "escalation_roadmap": roadmap_content,
            "confidence_score": confidence_score,
        }

    except Exception as e:
        # Log the actual error to your terminal for debugging
        print("--- BACKEND CRASH DETECTED ---")
        traceback.print_exc()
        print("------------------------------")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

    finally:
        # Guarantee local cleanup without crashing the web request due to Windows file locks
        if os.path.exists(temp_dir):
            try:
                # 1. Close any remaining file streams explicitly if your files list exists
                if "files" in locals() and files:
                    for file in files:
                        file.file.close()

                # 2. Attempt cleanup
                shutil.rmtree(temp_dir)
            except PermissionError:
                # 3. Fallback for stubborn Windows file-locks:
                # Schedule deletion on a micro-delay or ignore so the user still gets their letter!
                import threading
                import time

                def delayed_cleanup(path):
                    time.sleep(1)  # Wait 1 second for the SDK/OS to release the handle
                    try:
                        shutil.rmtree(path, ignore_errors=True)
                    except Exception:
                        pass

                threading.Thread(
                    target=delayed_cleanup, args=(temp_dir,), daemon=True
                ).start()
