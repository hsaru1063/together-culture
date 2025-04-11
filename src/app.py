from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import certifi

# === Load ENV ===
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET = os.getenv("JWT_SECRET", "secret")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# === App Init ===
app = FastAPI()
client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client["together_culture"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000"],  # ← frontend origin here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# === Models ===
class User(BaseModel):
    email: EmailStr
    password: str
    name: str
    is_admin: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

class Message(BaseModel):
    to: EmailStr
    text: str

class MemberPublic(BaseModel):
    name: str
    email: EmailStr
    status: str = "Active"

# === Utils ===
def create_access_token(data: dict, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"email": payload.get("sub")})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

# === Routes ===

@app.post("/signup")
async def signup(user: User):
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_data = user.dict()
    user_data.setdefault("status", "Active")
    await db.users.insert_one(user_data)
    return {"msg": "User created successfully"}

@app.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    print(f"Login attempt: {form.username} / {form.password}")
    user = await db.users.find_one({"email": form.username})
    print("User from DB:", user)
    if not user or user["password"] != form.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

from bson import ObjectId

def str_id_list(obj_ids):
    return [str(obj) for obj in obj_ids if isinstance(obj, ObjectId)]

@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "email": user["email"],
        "name": user["name"],
        "is_admin": user.get("is_admin", False),
        "status": user.get("status", "Active"),
        "registered_events": str_id_list(user.get("registered_events", []))
    }


@app.get("/admin/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admins only")
    active_members = await db.users.count_documents({"is_admin": False, "status": "Active"})
    total_signups = await db.users.count_documents({})
    event_count = await db.events.count_documents({})
    return {
        "active_members": active_members,
        "signups_this_month": total_signups,
        "events_this_month": event_count
    }

@app.get("/admin/members")
async def list_members(user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admins only")
    cursor = db.users.find({"is_admin": False})
    members = await cursor.to_list(length=100)
    return [MemberPublic(name=m["name"], email=m["email"], status=m.get("status", "Active")) for m in members]

@app.get("/member/dashboard")
async def member_dashboard(user: dict = Depends(get_current_user)):
    courses = await db.content.find({"type": "course"}).to_list(10)
    upcoming = await db.events.find({"category": "upcoming"}).to_list(10)
    recommended = await db.events.find({"category": "recommended"}).to_list(10)
    message_count = await db.messages.count_documents({"to": user["email"], "read": False})
    return {
        "upcoming_events": [e["title"] for e in upcoming],
        "recommended_events": [e["title"] for e in recommended],
        "messages": message_count,
        "courses": [c["title"] for c in courses]
    }

@app.get("/member/events")
async def member_events(user: dict = Depends(get_current_user)):
    upcoming = await db.events.find({"category": "upcoming"}).to_list(10)
    registered_ids = user.get("registered_events", [])
    registered = await db.events.find({"_id": {"$in": registered_ids}}).to_list(10)
    past = await db.events.find({"category": "past"}).to_list(10)
    return {
        "upcoming": [e["title"] for e in upcoming],
        "registered": [e["title"] for e in registered],
        "past": [e["title"] for e in past]
    }

@app.get("/member/messages")
async def get_messages(user: dict = Depends(get_current_user)):
    sent = await db.messages.distinct("to", {"from": user["email"]})
    received = await db.messages.distinct("from", {"to": user["email"]})
    conversations = list(set(sent + received))
    return {"conversations": conversations}

@app.post("/member/messages")
async def send_message(msg: Message, user: dict = Depends(get_current_user)):
    await db.messages.insert_one({
        "from": user["email"],
        "to": msg.to,
        "text": msg.text,
        "timestamp": datetime.utcnow(),
        "read": False
    })
    return {"msg": "Message sent"}

from bson import ObjectId

def serialize_content(content):
    content["_id"] = str(content["_id"])
    return content

@app.get("/content")
async def get_content():
    raw = await db.content.find({}).to_list(20)
    return [serialize_content(item) for item in raw]


# Optional: Enable running via `python app.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/landing.html")
