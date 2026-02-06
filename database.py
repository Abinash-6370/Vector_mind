import sqlite3
import os

DB_NAME = "notice_system"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn

def init_db():
    print("Ensuring Database tables exist...")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            course TEXT,
            year INTEGER,
            interests TEXT,
            role TEXT DEFAULT 'user'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            link TEXT,
            content TEXT,
            embedding TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            notice_id INTEGER NOT NULL,
            action_type TEXT NOT NULL, -- 'read' or 'save'
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notice_id) REFERENCES notices (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deadlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notice_id INTEGER NOT NULL,
            event_name TEXT NOT NULL,
            deadline_date TEXT NOT NULL,
            FOREIGN KEY (notice_id) REFERENCES notices (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            icon TEXT NOT NULL,
            title TEXT NOT NULL,
            desc TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    # Removed seeding from here, app.py handles it with embeddings
    conn.commit()

    conn.close()
    print("Database initialized.")

def create_user(name, email, password, course, year, interests, role='user'):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (name, email, password, course, year, interests, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, email, password, course, year, interests, role))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def get_user_by_email(email):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def create_notice(title, date, type, link="", content="", embedding=None):
    conn = get_db()
    cursor = conn.cursor()
    # Convert embedding list to JSON string for storage
    import json
    embedding_str = json.dumps(embedding) if embedding else None
    cursor.execute('''
        INSERT INTO notices (title, date, type, link, content, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (title, date, type, link, content, embedding_str))
    notice_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return notice_id

def get_all_notices():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notices ORDER BY id DESC')
    notices = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notices

def search_notices(query):
    """
    Search notices with prioritization: Exam > Scholarship > Admin > Events.
    Returns the best matching notice or None.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    query = query.lower()
    fluff = {"tell", "me", "about", "the", "content", "in", "of", "a", "an", "what", "is", "when", "how", "where", "with", "from"}
    query_words = [w.lower() for w in query.split() if w.lower() not in fluff and len(w) >= 3]
    
    if not query_words:
        conn.close()
        return None

    cursor.execute('SELECT * FROM notices')
    all_notices = cursor.fetchall()
    
    matches = []
    priority_order = ["exam", "scholarship", "admin", "events"]
    
    for notice in all_notices:
        score = 0
        notice_text = (notice['title'] + " " + (notice['content'] or "")).lower()
        for word in query_words:
            if word in notice_text:
                score += 1
        
        if score > 0:
            # Add category weight (Exams have highest priority)
            weight = 0
            if notice['type'] in priority_order:
                weight = (len(priority_order) - priority_order.index(notice['type'])) * 0.1
            
            matches.append((dict(notice), score + weight))
    
    conn.close()
    
    if matches:
        # Sort by score descending
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[0][0]
        
    return None

def semantic_search_notices(query_embedding):
    """
    Search notices using semantic similarity (cosine similarity on embeddings).
    Returns the best matching notice based on embedding similarity.
    """
    import json
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM notices WHERE embedding IS NOT NULL')
    all_notices = cursor.fetchall()
    conn.close()
    
    if not all_notices or query_embedding is None:
        return None
    
    # Calculate cosine similarity for each notice
    similarities = []
    for notice in all_notices:
        try:
            notice_embedding = json.loads(notice['embedding'])
            # Calculate cosine similarity
            similarity = cosine_similarity(
                [query_embedding], 
                [notice_embedding]
            )[0][0]
            similarities.append((dict(notice), similarity))
        except (json.JSONDecodeError, TypeError, KeyError):
            continue
    
    if not similarities:
        return None
    
    # Sort by similarity (highest first)
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    # Return the most similar notice
    return similarities[0][0]

def delete_notice(notice_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM user_activity WHERE notice_id = ?', (notice_id,))
    cursor.execute('DELETE FROM deadlines WHERE notice_id = ?', (notice_id,))
    cursor.execute('DELETE FROM notices WHERE id = ?', (notice_id,))
    conn.commit()
    conn.close()

def log_activity(user_id, notice_id, action_type):
    conn = get_db()
    cursor = conn.cursor()
    # Unique constraint simulation: check if 'read' already exists to avoid duplicates in count
    if action_type == 'read':
        cursor.execute('SELECT id FROM user_activity WHERE user_id = ? AND notice_id = ? AND action_type = "read"', (user_id, notice_id))
        if cursor.fetchone():
            conn.close()
            return

    cursor.execute('''
        INSERT INTO user_activity (user_id, notice_id, action_type)
        VALUES (?, ?, ?)
    ''', (user_id, notice_id, action_type))
    conn.commit()
    conn.close()

def get_user_stats(user_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Notices Read (Unique notices)
    cursor.execute('SELECT COUNT(DISTINCT notice_id) FROM user_activity WHERE user_id = ? AND action_type = "read"', (user_id,))
    read_count = cursor.fetchone()[0]
    
    # Saved Items
    cursor.execute('SELECT COUNT(*) FROM user_activity WHERE user_id = ? AND action_type = "save"', (user_id,))
    saved_count = cursor.fetchone()[0]
    
    # Upcoming Deadlines (Actual deadlines from future or today)
    import datetime
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    cursor.execute('SELECT COUNT(*) FROM deadlines WHERE deadline_date >= ?', (today,))
    deadline_count = cursor.fetchone()[0]
    
    conn.close()
    return {
        "read": read_count,
        "saved": saved_count,
        "deadlines": deadline_count
    }

def add_deadline(notice_id, event_name, deadline_date):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO deadlines (notice_id, event_name, deadline_date)
        VALUES (?, ?, ?)
    ''', (notice_id, event_name, deadline_date))
    conn.commit()
    conn.close()

# Notification Functions
def create_notification(user_id, icon, title, desc):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notifications (user_id, icon, title, desc)
        VALUES (?, ?, ?, ?)
    ''', (user_id, icon, title, desc))
    conn.commit()
    conn.close()

def get_notifications(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC', (user_id,))
    notifs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notifs

def clear_notifications(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notifications WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
