import aiosmtplib
from email.message import EmailMessage
from email.utils import formatdate
import os
import mimetypes
from database import AsyncSessionLocal, AppSettings
from sqlalchemy import select

class EmailService:
    async def get_settings(self):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
            return result.scalar_one_or_none()

    async def send_html_digest(self, to_email: str, subject: str, html_body: str, attachments: list = None):
        """Send a rich HTML digest email with optional attachments"""
        settings = await self.get_settings()
        if not settings or not settings.smtp_username or not settings.smtp_password:
            print("SMTP Credentials not set in database.")
            return False

        message = EmailMessage()
        message["From"] = settings.smtp_username
        message["To"] = to_email
        message["Subject"] = subject
        message["Date"] = formatdate(localtime=True)
        # Fix: Content-Type is handled by add_alternative and add_attachment
        message.set_content("Please use an HTML compatible email client to view this message.")
        message.add_alternative(html_body, subtype="html")

        if attachments:
            for file_path in attachments:
                if not file_path or not os.path.exists(file_path):
                    continue
                
                ctype, encoding = mimetypes.guess_type(file_path)
                if ctype is None or encoding is not None:
                    ctype = "application/octet-stream"
                
                if "/" in ctype:
                    maintype, subtype = ctype.split("/", 1)
                else:
                    maintype, subtype = "application", "octet-stream"
                
                try:
                    with open(file_path, "rb") as f:
                        file_data = f.read()
                        message.add_attachment(
                            file_data,
                            maintype=maintype,
                            subtype=subtype,
                            filename=os.path.basename(file_path)
                        )
                except Exception as e:
                    print(f"Failed to attach {file_path}: {e}")

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_server,
                port=settings.smtp_port or 587,
                start_tls=True,
                username=settings.smtp_username,
                password=settings.smtp_password,
            )
            return True
        except Exception as e:
            print(f"Failed to send digest email: {e}")
            return False

    async def send_email(self, to_email: str, subject: str, body: str, attachments: list = None):
        """Standard email with optional attachments"""
        settings = await self.get_settings()
        if not settings or not settings.smtp_username or not settings.smtp_password:
            print("SMTP Credentials not set in database.")
            return False

        message = EmailMessage()
        message["From"] = settings.smtp_username
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        if attachments:
            for file_path in attachments:
                if not file_path or not os.path.exists(file_path):
                    continue
                ctype, _ = mimetypes.guess_type(file_path)
                maintype, subtype = (ctype or "application/octet-stream").split("/", 1)
                with open(file_path, "rb") as f:
                    message.add_attachment(f.read(), maintype=maintype, subtype=subtype, filename=os.path.basename(file_path))

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_server,
                port=settings.smtp_port or 587,
                start_tls=True,
                username=settings.smtp_username,
                password=settings.smtp_password,
            )
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

email_service = EmailService()
send_email = email_service.send_email
send_html_digest = email_service.send_html_digest
