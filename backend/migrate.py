"""
Database migration script - Ensures existing databases have all required columns
"""
import sqlite3
import os

DB_PATH = "./data/db.sqlite3"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"No database found at {DB_PATH}. Skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tables to check
    table_migrations = {
        "admin_users": [
            ("two_factor_secret", "TEXT"),
            ("two_factor_enabled", "BOOLEAN DEFAULT 0")
        ],
        "app_settings": [
            ("imap_enabled", "BOOLEAN DEFAULT 0"),
            ("bidirectional_target_chat", "TEXT"),
            ("forward_videos", "BOOLEAN DEFAULT 1"),
            ("forward_files", "BOOLEAN DEFAULT 1"),
            ("max_video_size_mb", "INTEGER DEFAULT 10"),
            ("telegram_authenticated", "BOOLEAN DEFAULT 0")
        ],
        "message_logs": [
            ("sender_name", "TEXT"),
            ("attachment_path", "TEXT")
        ]
    }

    print("Checking for missing columns...")
    for table, columns in table_migrations.items():
        try:
            # Get existing columns
            cursor.execute(f"PRAGMA table_info({table})")
            existing_columns = [row[1] for row in cursor.fetchall()]
            
            for col_name, col_type in columns:
                if col_name not in existing_columns:
                    print(f"Adding column '{col_name}' to table '{table}'...")
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                    print(f"✅ Added {col_name}")
        except Exception as e:
            print(f"⚠️ Error migrating table {table}: {e}")

    # Ensure ForwardingRule table exists
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='forwarding_rules'")
        if not cursor.fetchone():
            print("Creating forwarding_rules table...")
            cursor.execute("""
                CREATE TABLE forwarding_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    destination_type TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ Created forwarding_rules table")
    except Exception as e:
        print(f"⚠️ Error creating table: {e}")

    conn.commit()
    conn.close()
    print("🎉 Migration check complete.")

if __name__ == "__main__":
    migrate()
