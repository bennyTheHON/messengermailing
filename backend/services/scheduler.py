"""
Scheduler Service - Handles periodic message forwarding based on email-source mappings
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from database import AsyncSessionLocal, ForwardingRule, MessageLog, Account, AccountType
from sqlalchemy import select
import asyncio
import os

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            print("Scheduler started")
        self.is_running = True
        asyncio.create_task(self.sync_all_rules())

    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        self.is_running = False

    async def sync_all_rules(self):
        """Sync scheduler jobs with active rules in DB"""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ForwardingRule).where(ForwardingRule.enabled == True))
            rules = result.scalars().all()
            
            # Remove jobs for rules that are no longer enabled/present
            active_rule_ids = [f"rule_{r.id}" for r in rules]
            for job in self.scheduler.get_jobs():
                if job.id.startswith("rule_") and job.id not in active_rule_ids:
                    self.scheduler.remove_job(job.id)
            
            # Add or update jobs for enabled rules
            for rule in rules:
                if rule.forwarding_type == "digest":
                    self.update_rule_job(rule)

    def update_interval(self, minutes: int, enabled: bool = True):
        """Legacy support for global interval or master trigger for rule sync"""
        print(f"Scheduler: Global trigger/sync requested (Enabled: {enabled})")
        if not enabled:
            # Maybe stop all rule jobs? 
            # For now, we follow the rule-based logic more closely.
            pass
        
        # Trigger an immediate sync of all rules
        asyncio.create_task(self.sync_all_rules())

    def update_rule_job(self, rule: ForwardingRule):
        """Add or update a job for a specific rule"""
        job_id = f"rule_{rule.id}"
        interval = rule.interval_minutes or 5
        
        self.scheduler.add_job(
            self.execute_rule_task,
            trigger=IntervalTrigger(minutes=interval),
            id=job_id,
            args=[rule.id],
            replace_existing=True
        )
        print(f"Scheduler: Synced Rule {rule.id} ({interval} min)")

    async def execute_rule_task(self, rule_id: int):
        """Execute logic for a specific digest rule"""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ForwardingRule).where(ForwardingRule.id == rule_id))
            rule = result.scalar_one_or_none()
            if not rule or not rule.enabled:
                return

            # Get destination account
            dest_res = await db.execute(select(Account).where(Account.id == rule.destination_account_id))
            dest_account = dest_res.scalar_one_or_none()
            if not dest_account:
                return

            import json
            from services.email_service import send_html_digest
            
            dest_config = json.loads(rule.destination_config_json) if rule.destination_config_json else {}
            target_email = dest_config.get("email")
            if not target_email:
                return

            # Fetch pending messages for this rule
            msg_res = await db.execute(
                select(MessageLog).where(
                    MessageLog.rule_id == rule.id,
                    MessageLog.status == "PENDING"
                )
            )
            msgs = msg_res.scalars().all()
            if not msgs:
                return

            print(f"📥 Generating digest for Rule {rule.id} to {target_email} ({len(msgs)} msgs)")
            
            # Grouping and HTML Building (Logic identical to previous, but scoped)
            digest_data = {} # {sender_name: [messages]}
            attachments = []
            for msg in msgs:
                snd = msg.sender_name or "Unknown"
                if snd not in digest_data: digest_data[snd] = []
                digest_data[snd].append(msg)
                if msg.attachment_path and os.path.exists(msg.attachment_path):
                    attachments.append(msg.attachment_path)

            html_body = f"<div dir='rtl' style='font-family: Tahoma;'><h3>گزارش پیام‌های جدید</h3>"
            for snd, m_list in digest_data.items():
                html_body += f"<div style='border-right: 3px solid #3b82f6; padding: 10px; margin: 10px 0;'><strong>📦 فرستنده: {snd}</strong><br>"
                for m in m_list:
                    html_body += f"<div>{m.message_content or 'پیام بدون متن'}</div>"
                html_body += "</div>"
            html_body += "</div>"

            success = await send_html_digest(target_email, f"Digest: {rule.name or f'Rule {rule.id}'}", html_body, attachments)
            if success:
                for m in msgs:
                    m.status = "SENT"
                await db.commit()
                # Cleanup attachments
                for path in attachments:
                    try: os.remove(path)
                    except: pass

# Global instance
scheduler_service = SchedulerService()

def start_scheduler():
    """Initialize and start the scheduler (called on app startup)"""
    scheduler_service.start()
