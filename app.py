import os
import cv2
import pytesseract
import numpy as np
import datetime
import time
import threading
import fitz  # PyMuPDF
from PIL import Image
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import database

# ===================== EMBEDDING MODEL =====================
from sentence_transformers import SentenceTransformer
print("Loading embedding model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Embedding model loaded successfully!")

# ===================== TESSERACT CONFIG =====================
TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"/usr/bin/tesseract"
]

for path in TESSERACT_PATHS:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        break

# ===================== FLASK APP =====================
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = ".uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

OCR_PROGRESS = {}

# ===================== OCR PROGRESS =====================
@app.route("/upload/progress/<task_id>")
def get_ocr_progress(task_id):
    return jsonify(OCR_PROGRESS.get(task_id, {"status": "starting"}))

# ===================== UTIL =====================
def filter_non_english(text):
    import re
    return re.sub(r"[^\x00-\x7F]+", "", text).strip()

# ===================== NOTIFICATIONS =====================
@app.route("/notifications/latest/<user_id>")
def get_notifications(user_id):
    return jsonify(database.get_notifications(user_id))

@app.route("/notifications/clear/<user_id>", methods=["POST"])
def clear_notifications(user_id):
    database.clear_notifications(user_id)
    return jsonify({"status": "success"})

# ===================== AI SEARCH =====================
@app.route("/ai/search")
def ai_search():
    query = request.args.get("query", "").lower()
    if not query:
        return jsonify({"answer": "Please enter a query."})

    query_embedding = embedding_model.encode(query).tolist()
    match = database.semantic_search_notices(query_embedding) or database.search_notices(query)

    if not match:
        return jsonify({"answer": f"No records found for '{query}'."})

    content = filter_non_english(match["content"] or "")
    pos = next((content.lower().find(w) for w in query.split() if w in content.lower()), 0)

    snippet = content[max(0, pos-100):pos+400]
    answer = f"Based on **{match['title']}**: {snippet}"

    return jsonify({
        "answer": answer,
        "source": match
    })

# ===================== DATABASE INIT =====================
database.init_db()

# ===================== NOTICE CLASSIFIER =====================
def classify_notice(text):
    text = text.lower()
    if any(k in text for k in ["scholarship", "stipend", "grant"]):
        return "scholarship"
    if any(k in text for k in ["exam", "timetable", "result", "viva"]):
        return "exam"
    if any(k in text for k in ["event", "seminar", "workshop", "guest lecture"]):
        return "events"
    return "admin"

# ===================== OCR HELPERS =====================
def preprocess_image_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    return thresh

def extract_text_from_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return ""
    processed = preprocess_image_for_ocr(image)
    return pytesseract.image_to_string(processed, config="--oem 3 --psm 3")

# ===================== DEADLINE EXTRACTION =====================
def extract_deadlines(text):
    import re
    from dateutil import parser
    deadlines = []

    pattern = r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b"
    for line in text.split("\n"):
        if any(k in line.lower() for k in ["deadline", "last date", "exam", "viva"]):
            dates = re.findall(pattern, line, re.IGNORECASE)
            for d in dates:
                try:
                    parsed = parser.parse(d, fuzzy=True)
                    deadlines.append((line[:100], parsed.strftime("%Y-%m-%d")))
                except:
                    pass
    return deadlines

# ===================== OCR BACKGROUND TASK (FIXED) =====================
def process_ocr_task(task_id, filepath, original_filename, ext, upload_folder):
    try:
        extracted_text = ""

        if ext == ".pdf":
            doc = fitz.open(filepath)
            OCR_PROGRESS[task_id] = {"status": "scanning", "current": 0, "total": len(doc)}

            for i, page in enumerate(doc):
                OCR_PROGRESS[task_id]["current"] = i + 1

                # 🔥 FIX: Try native PDF text FIRST
                page_text = page.get_text("text")

                # 🔁 Fallback to OCR only if empty
                if not page_text.strip():
                    pix = page.get_pixmap(dpi=300)
                    img_path = os.path.join(upload_folder, f"tmp_{task_id}_{i}.png")
                    pix.save(img_path)
                    page_text = extract_text_from_image(img_path)
                    os.remove(img_path)

                extracted_text += page_text + "\n"

            doc.close()
        else:
            extracted_text = extract_text_from_image(filepath)

        notice_type = classify_notice(extracted_text)
        date_str = datetime.datetime.now().strftime("%b %d, %Y")
        file_url = f"http://127.0.0.1:5000/uploads/{os.path.basename(filepath)}"

        embedding = embedding_model.encode(extracted_text).tolist() if extracted_text else None

        notice_id = database.create_notice(
            title=f"Uploaded: {original_filename}",
            date=date_str,
            type=notice_type,
            link=file_url,
            content=extracted_text,
            embedding=embedding
        )

        for event, d in extract_deadlines(extracted_text):
            database.add_deadline(notice_id, event, d)

        database.create_notification("1", "📄", "New File Added", original_filename)

        OCR_PROGRESS[task_id]["status"] = "complete"

    except Exception as e:
        OCR_PROGRESS[task_id] = {"status": "error", "message": str(e)}

# ===================== UPLOAD =====================
@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    if not file:
        return jsonify({"message": "No file"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        return jsonify({"message": "Unsupported type"}), 400

    filename = f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    task_id = datetime.datetime.now().strftime("%H%M%S%f")
    threading.Thread(
        target=process_ocr_task,
        args=(task_id, filepath, file.filename, ext, UPLOAD_FOLDER)
    ).start()

    return jsonify({"task_id": task_id}), 202

# ===================== ROUTES =====================
@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/notices")
def get_notices():
    return jsonify(database.get_all_notices())

@app.route("/")
def home():
    return "Backend running successfully!"

# ===================== RUN =====================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
