"""
Account Manager - Handles multiple Telegram and Email account sessions
"""
import asyncio
import json
import os
from typing import Dict, Any, Optional
from telethon import TelegramClient
from database import AsyncSessionLocal, Account, AccountType, AppSettings
from sqlalchemy import select
from services.telegram_client import TelegramService

# Directory for Telegram session files
SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'sessions')
os.makedirs(SESSIONS_DIR, exist_ok=True)

class AccountManager:
    def __init__(self):
        self.telegram_services: Dict[int, TelegramService] = {}
        self.running = False

    async def start_all(self):
        """Start all active accounts"""
        if self.running:
            return
        self.running = True
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Account).where(Account.is_active == True))
            accounts = result.scalars().all()
            
            for account in accounts:
                if account.account_type == AccountType.TELEGRAM:
                    await self.start_telegram_account(account)
        
        print(f"AccountManager: Started {len(self.telegram_services)} Telegram accounts.")

    async def start_telegram_account(self, account: Account):
        """Initialize and start a specific Telegram account service"""
        if account.id in self.telegram_services:
            return self.telegram_services[account.id].client

        service = TelegramService(account.id)
        await service.start()
        
        if service.client:
            self.telegram_services[account.id] = service
            return service.client
        return None

    async def get_client(self, account_id: int):
        """Get connected Telegram client for an account"""
        service = self.telegram_services.get(account_id)
        return service.client if service else None

    async def stop_all(self):
        """Stop all managed clients"""
        self.running = False
        for service in self.telegram_services.values():
            if service.client:
                await service.client.disconnect()
        self.telegram_services.clear()

account_manager = AccountManager()
