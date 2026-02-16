"""
Telegram Client Service - Handles Telegram authentication and message monitoring
"""
import os
import asyncio
import json
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError
from telethon.tl.types import Channel as TelegramChannel, Chat, User
from database import AsyncSessionLocal, Source, MessageLog, SourceType, ForwardingRule, Account, AccountType, AppSettings
from sqlalchemy import select
from typing import Optional, List, Dict
from services.email_service import send_email

# Determine where to save the session file
SESSION_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'monitor_session')

class TelegramService:
    def __init__(self, account_id: int):
        self.account_id = account_id
        self.client = None
        self.is_connected = False
        self.api_id = None
        self.api_hash = None
        self.phone = None

    async def start(self):
        """Initializes the client for this specific account."""
        async with AsyncSessionLocal() as db:
            # Get global API credentials and account session data
            settings_res = await db.execute(select(AppSettings).where(AppSettings.id == 1))
            settings = settings_res.scalar_one_or_none()
            
            acc_res = await db.execute(select(Account).where(Account.id == self.account_id))
            account = acc_res.scalar_one_or_none()
            
            if not settings or not settings.telegram_api_id or not account:
                print(f"Error starting Telegram account {self.account_id}: Settings or Account missing")
                return

            self.api_id = settings.telegram_api_id
            self.api_hash = settings.telegram_api_hash
            
            session_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'sessions', f'account_{self.account_id}')
            self.client = TelegramClient(session_file, int(self.api_id), self.api_hash)
            
            await self.client.connect()
            self.is_connected = await self.client.is_user_authorized()
            
            if self.is_connected:
                print(f"Telegram Account {self.account_id} Authorized and Connected.")
                self.register_handlers()
            else:
                print(f"Telegram Account {self.account_id} NOT Authorized.")

    async def send_code(self, phone: str):
        if not self.client: await self.start()
        self.phone = phone
        try:
            await self.client.send_code_request(phone)
            return {"status": "code_sent", "message": "Verification code sent."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def sign_in(self, code: str, password: Optional[str] = None):
        """Completes the sign-in and updates DB status."""
        try:
            if password:
                await self.client.sign_in(password=password)
            else:
                await self.client.sign_in(self.phone, code)
            
            self.is_connected = True
            self.register_handlers()
            
            # Update Database Status
            async with AsyncSessionLocal() as db:
                acc_res = await db.execute(select(Account).where(Account.id == self.account_id))
                account = acc_res.scalar_one_or_none()
                if account:
                    account.is_active = True
                    await db.commit()
            
            return {"status": "success", "message": "Logged in successfully."}
        except SessionPasswordNeededError:
            return {"status": "2fa_required", "message": "2FA Password needed."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def logout(self):
        if not self.client: return {"status": "error", "message": "Not connected"}
        try:
            await self.client.log_out()
            self.is_connected = False
            return {"status": "success", "message": "Logged out successfully"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def get_dialogs(self) -> List[Dict]:
        if not self.client or not self.is_connected: return []
        try:
            dialogs = await self.client.get_dialogs()
            result = []
            
            for dialog in dialogs:
                entity = dialog.entity
                # CRITICAL: Use dialog.id instead of entity.id to get the Peer ID (with -100 prefix)
                source_id = str(dialog.id) 
                source_name = getattr(entity, 'title', None) or getattr(entity, 'first_name', None) or 'Unknown'
                
                # Determine source type
                source_type = "channel" if isinstance(entity, TelegramChannel) and entity.broadcast else "group" if isinstance(entity, (TelegramChannel, Chat)) else "private_chat"
                
                result.append({
                    "source_id": source_id,
                    "source_name": source_name,
                    "source_type": source_type
                })
            
            return result
        except Exception as e:
            print(f"Error fetching dialogs: {e}")
            return []

    async def send_message(self, chat_id: str, text: str):
        if not self.client or not self.is_connected: return False
        try:
            target = int(chat_id) if chat_id.startswith("-") or chat_id.isdigit() else chat_id
            await self.client.send_message(target, text, parse_mode='md')
            return True
        except Exception as e:
            print(f"Failed to send Telegram message: {e}")
            return False

    def register_handlers(self):
        """Registers event listeners for new messages with rule filtering."""
        print(f"Registering handlers for Telegram Account {self.account_id}...")
        @self.client.on(events.NewMessage(incoming=True))
        async def handler(event):
            chat_id = str(event.chat_id)
            
            async with AsyncSessionLocal() as db:
                # Find all active rules for THIS account and THIS source chat
                result = await db.execute(
                    select(ForwardingRule).where(
                        ForwardingRule.source_account_id == self.account_id,
                        ForwardingRule.enabled == True
                    )
                )
                rules = result.scalars().all()
                
                matched_rules = []
                for rule in rules:
                    # Check if filters match (simplistic for now: if filter is None or chat_id is in list)
                    filters = json.loads(rule.source_filter_json) if rule.source_filter_json else []
                    if not filters or chat_id in filters or "*" in filters:
                        matched_rules.append(rule)
                
                if matched_rules:
                    sender = await event.get_sender()
                    sender_name = getattr(sender, 'first_name', None) or getattr(sender, 'title', None) or "Unknown"
                    
                    # Log message for EACH matched rule (or once per message? let's do once per rule for clarity in logs)
                    for rule in matched_rules:
                        # Process forwarding based on destination account...
                        # This part will be expanded in the unified worker service
                        print(f"🎯 Rule {rule.id} matched for message in {chat_id}")
                        # (Forwarding logic will be moved to a shared method)
                        await self.process_forwarding(rule, event, sender_name)
                    
                    await db.commit()

    async def process_forwarding(self, rule, event, sender_name):
        """Handle actual forwarding based on rule destination"""
        
        async with AsyncSessionLocal() as db:
            dest_acc_res = await db.execute(select(Account).where(Account.id == rule.destination_account_id))
            dest_account = dest_acc_res.scalar_one_or_none()
            
            if not dest_account: return

            dest_config = json.loads(rule.destination_config_json) if rule.destination_config_json else {}
            attachment_path = None
            
            # Handle Media Download if needed (Instant only, or for Digest logging)
            if event.media and rule.forwarding_type == "digest":
                # For digests, we must save the file locally
                media_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'media')
                os.makedirs(media_dir, exist_ok=True)
                attachment_path = await event.download_media(file=media_dir)

            log = MessageLog(
                rule_id=rule.id,
                source_account_id=self.account_id,
                message_id=str(event.id),
                sender_name=sender_name,
                message_content=event.text[:1000] if event.text else "",
                attachment_path=attachment_path,
                status="PENDING" if rule.forwarding_type == "digest" else "PROCESSING"
            )
            db.add(log)
            await db.flush() # Get ID

            if rule.forwarding_type == "instant":
                if dest_account.account_type in [AccountType.EMAIL_SMTP, AccountType.EMAIL_IMAP]:
                    # Forward to Email
                    target_email = dest_config.get("email")
                    if target_email:
                        subject = f"Forward: {sender_name}"
                        body = f"From Account {self.account_id}\nSender: {sender_name}\n\n{event.text}"
                        # Download temporary for instant email if media exists
                        temp_path = None
                        if event.media: temp_path = await event.download_media()
                        success = await send_email(target_email, subject, body, [temp_path] if temp_path else [])
                        log.status = "SENT" if success else "FAILED"
                        if temp_path and os.path.exists(temp_path): os.remove(temp_path)
                
                elif dest_account.account_type == AccountType.TELEGRAM:
                    # Messenger to Messenger!
                    target_chat = dest_config.get("chat_id")
                    if target_chat:
                        # We need the client for the destination account...
                        from services.account_manager import account_manager
                        dest_client = await account_manager.get_client(dest_account.id)
                        if dest_client:
                            try:
                                await dest_client.send_message(
                                    int(target_chat) if target_chat.startswith("-") or target_chat.isdigit() else target_chat, 
                                    f"**Forwarded from Account {self.account_id}**\n_Sender: {sender_name}_\n\n{event.text}",
                                    file=event.media if event.media else None
                                )
                                log.status = "SENT"
                            except Exception as e:
                                print(f"Failed messenger-to-messenger: {e}")
                                log.status = "FAILED"
            
            await db.commit()
