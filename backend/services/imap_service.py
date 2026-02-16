"""
IMAP Service - Polls for new emails and forwards to Telegram
"""
import ssl
import aioimaplib
import email
from email.header import decode_header
import asyncio
import logging
import re
from datetime import datetime
import os
from database import AsyncSessionLocal, Account, AccountType, ForwardingRule, AppSettings
from sqlalchemy import select
from services.telegram_client import TelegramService

logger = logging.getLogger("imap_service")

class IMAPService:
    def __init__(self):
        self.running = False
        self._task = None

    async def start(self):
        if self.running: return
        self.running = True
        self._task = asyncio.create_task(self.poll_loop())
        logger.info("IMAP Service started")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try: await self._task
            except asyncio.CancelledError: pass
        logger.info("IMAP Service stopped")
            
    async def poll_loop(self):
        while self.running:
            try:
                print(f"💓 [HEARTBEAT] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - IMAP check started")
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(Account).where(Account.account_type == AccountType.EMAIL_IMAP, Account.is_active == True))
                    accounts = result.scalars().all()
                    
                    if not accounts:
                        await asyncio.sleep(60)
                        continue

                    for account in accounts:
                        await self.poll_account(account)
            except Exception as e:
                logger.error(f"Error in IMAP poll loop: {e}")
            await asyncio.sleep(60)

    async def poll_account(self, account: Account):
        """Poll a specific IMAP account and route messages based on rules"""
        import json
        try:
            creds = json.loads(account.credentials_json) if account.credentials_json else {}
            host = creds.get("host")
            port = creds.get("port", 993)
            user = creds.get("user")
            password = creds.get("password")
            
            if not host or not user or not password:
                return

            imap_client = aioimaplib.IMAP4_SSL(host=host, port=port)
            await imap_client.wait_hello_from_server()
            await imap_client.login(user, password)
            await imap_client.select('INBOX')
            
            rv, data = await imap_client.search('UNSEEN')
            if rv != 'OK':
                await imap_client.logout()
                return

            msg_ids = data[0].split()
            if not msg_ids:
                await imap_client.logout()
                return

            print(f"📩 Account {account.name}: Found {len(msg_ids)} unread emails")

            for msg_id in msg_ids:
                rv, data = await imap_client.fetch(msg_id, '(RFC822)')
                if rv != 'OK': continue

                raw_email = data[1]
                msg = email.message_from_bytes(raw_email)
                subject = self.decode_mime_header(msg['Subject'])
                sender = self.decode_mime_header(msg['From'])
                
                email_match = re.search(r'[\w\.-]+@[\w\.-]+', sender)
                clean_sender_email = email_match.group(0).lower() if email_match else sender.lower()

                body = ""
                attachments = []
                temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'temp')
                os.makedirs(temp_dir, exist_ok=True)

                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))

                        if content_type == "text/plain" and "attachment" not in content_disposition:
                            try:
                                body += part.get_payload(decode=True).decode(errors='ignore')
                            except: pass
                        elif "attachment" in content_disposition or content_type not in ["text/plain", "text/html"]:
                            filename = part.get_filename()
                            if filename:
                                filepath = os.path.join(temp_dir, f"{datetime.now().timestamp()}_{filename}")
                                try:
                                    with open(filepath, "wb") as f:
                                        f.write(part.get_payload(decode=True))
                                    attachments.append(filepath)
                                except Exception as e:
                                    logger.error(f"Failed to save attachment {filename}: {e}")
                else: 
                     try:
                        body = msg.get_payload(decode=True).decode(errors='ignore')
                     except: pass

                # Route based on rules for THIS account
                async with AsyncSessionLocal() as session:
                    rule_result = await session.execute(
                        select(ForwardingRule).where(
                            ForwardingRule.source_account_id == account.id,
                            ForwardingRule.enabled == True
                        )
                    )
                    rules = rule_result.scalars().all()
                
                for rule in rules:
                    filters = json.loads(rule.source_filter_json) if rule.source_filter_json else []
                    # Filter by sender email
                    # Filter by sender email
                    if not filters or clean_sender_email in filters or "*" in filters:
                        await self.process_imap_routing(rule, sender, subject, body, attachments)
                
                # Mark as seen so we don't process it again next time
                await imap_client.store(msg_id, '+FLAGS', '(\\Seen)')
                
                # Cleanup attachments (if not used by digest? Wait, digest needs them persistent... 
                # Actually for digest we should move them to media dir. For instant we delete.)
                # Ideally process_imap_routing handles logic.

            await imap_client.logout()
        except Exception as e:
            logger.error(f"IMAP poll failed for account {account.id}: {e}")

    async def process_imap_routing(self, rule, sender, subject, body, attachments=None):
        from database import MessageLog, Account, AccountType
        from services.email_service import send_email
        from services.account_manager import account_manager
        import json
        import shutil

        # Ensure media directory for persistent storage (Digests)
        media_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'media')
        os.makedirs(media_dir, exist_ok=True)

        async with AsyncSessionLocal() as db:
            dest_acc_res = await db.execute(select(Account).where(Account.id == rule.destination_account_id))
            dest_account = dest_acc_res.scalar_one_or_none()
            if not dest_account: return

            dest_config = json.loads(rule.destination_config_json) if rule.destination_config_json else {}
            
            # For Digest: Move first attachment to media dir (MessageLog only supports one path currently)
            # Future improvement: Support multiple attachment paths in DB
            stored_attachment_path = None
            if rule.forwarding_type == "digest" and attachments:
                try:
                    src = attachments[0]
                    filename = os.path.basename(src)
                    dst = os.path.join(media_dir, filename)
                    shutil.copy2(src, dst)
                    stored_attachment_path = dst
                except Exception as e:
                    logger.error(f"Failed to store attachment for digest: {e}")

            log = MessageLog(
                rule_id=rule.id,
                source_account_id=rule.source_account_id,
                message_id=f"imap_{datetime.now().timestamp()}",
                sender_name=sender,
                message_content=body[:1000],
                attachment_path=stored_attachment_path,
                status="PENDING" if rule.forwarding_type == "digest" else "PROCESSING"
            )
            db.add(log)
            await db.flush()

            if rule.forwarding_type == "instant":
                text = f"📧 *New Email Received*\n\n*From:* {sender}\n*Subject:* {subject}\n\n{body[:1000]}"
                
                if dest_account.account_type in [AccountType.EMAIL_SMTP, AccountType.EMAIL_IMAP]:
                    target_email = dest_config.get("email")
                    if target_email:
                        success = await send_email(target_email, subject, body, attachments) # Pass list
                        log.status = "SENT" if success else "FAILED"
                
                elif dest_account.account_type == AccountType.TELEGRAM:
                    target_chat = dest_config.get("chat_id")
                    if target_chat:
                        dest_client = await account_manager.get_client(dest_account.id)
                        if dest_client:
                            try:
                                # Send text first
                                await dest_client.send_message(
                                    int(target_chat) if target_chat.startswith("-") or target_chat.isdigit() else target_chat, 
                                    text
                                )
                                # Send attachments
                                if attachments:
                                    for att_path in attachments:
                                        await dest_client.send_file(
                                             int(target_chat) if target_chat.startswith("-") or target_chat.isdigit() else target_chat,
                                             att_path
                                        )

                                log.status = "SENT"
                            except Exception as e:
                                logger.error(f"Telegram forward error: {e}")
                                log.status = "FAILED"
            
            await db.commit()

    def decode_mime_header(self, header):
        if not header: return "No Subject"
        decoded = decode_header(header)
        header_parts = []
        for content, encoding in decoded:
            if isinstance(content, bytes):
                header_parts.append(content.decode(encoding or 'utf-8', errors='ignore'))
            else: header_parts.append(content)
        return "".join(header_parts)

imap_service = IMAPService()
