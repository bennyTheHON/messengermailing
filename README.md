# messenger2mail
### انتقال دوطرفه پیام‌ها بین پیام‌رسان‌ها و سرویس‌های ایمیل

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/bennyTheHON/telegautoemail)
[![Docker](https://img.shields.io/badge/docker-built-green.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[**🇬🇧 English Documentation**](#-english-guide) | [**🇮🇷 راهنمای فارسی**](#-راهنمای-فارسی)

---

## 🇮🇷 راهنمای فارسی

**messenger2mail** ابزاری برای انتقال دوطرفه پیام‌ها بین پیام‌رسان‌ها (مثل تلگرام) و سرویس‌های ایمیل است. این ابزار به شما اجازه می‌دهد پیام‌های پیام‌رسان را در ایمیل دریافت کنید و یا بالعکس.

### 📋 ویژگی‌ها
- **انتقال دوطرفه**: هدایت پیام‌ها از پیام‌رسان به ایمیل و از ایمیل به پیام‌رسان (Routing).
- **پشتیبانی از منابع مختلف**: دریافت پیام از کانال‌ها، گروه‌ها و چت‌های شخصی.
- **پنل وب**: رابط کاربری ساده برای مدیریت قوانین و تنظیمات (فارسی و انگلیسی).
- **مسیریابی و زمان‌بندی (Unified Routing)**:
    - **دایجست (Digest)**: اشتراک چندین منبع و دریافت پیام‌ها به صورت یکجا در بازه‌های زمانی مشخص در قالب ایمیل.
    - **قوانین آنی (Instant)**: هدایت فوری پیام‌ها بین ایمیل و پیام‌رسان به صورت لحظه‌ای.
    - **مدیریت متمرکز**: تمام تنظیمات منابع، ایمیل‌ها و قوانین در یک بخش واحد (Routing) انجام می‌شود.
- **امنیت**: 
    - ورود با JWT.
    - پشتیبانی از تایید دو مرحله‌ای (2FA).
    - امکان تنظیم SSL (HTTPS).
- **نصب با داکر**: قابلیت راه‌اندازی با استفاده از Docker Compose.

### 🛠 پیش‌نیازها
- لینوکس یا ویندوز.
- **Docker** و **Docker Compose**.

### ⚙️ نصب و راه‌اندازی
1. دریافت کدها:
   ```bash
   git clone https://github.com/bennyTheHON/telegautoemail.git
   cd telegautoemail
   ```
2. اجرای اسکریپت نصب:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   *اطلاعات لازم در طول نصب از شما پرسیده می‌شود.*

### 📖 نحوه استفاده
1. **ورود**: پس از نصب، پنل وب را در مرورگر باز کنید.
2. **اتصال**: حساب پیام‌رسان خود را در بخش **Messengers** متصل کنید.
3. **مسیریابی**: منابع، ایمیل‌ها و تمام قوانین انتقال را در بخش **Routing** مدیریت کنید.
4. **تنظیمات فنی**: اطلاعات فنی مانند سرورهای SMTP و IMAP را در بخش **Admin Settings** وارد نمایید.

---

## 🇬🇧 English Guide

**messenger2mail** is a tool for bidirectional message forwarding between messengers (like Telegram) and email services. It helps you receive messenger notifications in your email and send messages back via email.

### 📋 Features
- **Bidirectional Forwarding**: Route messages from messengers to email and vice versa (Unified Routing).
- **Source Support**: Monitor channels, groups, and private chats.
- **Web Dashboard**: Simple UI for managing routing rules and settings (EN/FA support).
- **Scheduling & Real-time**: 
    - **Instant Mode**: Real-time forwarding between platforms.
    - **Digest Mode**: Periodic HTML email digests for monitored sources.
- **Security**:
    - JWT authentication for the dashboard.
    - Two-Factor Authentication (2FA) support.
    - SSL/TLS support for secure access.
- **Docker Support**: Deployment using Docker Compose.

### 🛠 Prerequisites
- Linux or Windows/Mac.
- **Docker** and **Docker Compose** installed.

### ⚙️ Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/bennyTheHON/telegautoemail.git
   cd telegautoemail
   ```
2. Run the deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### 📖 How to Use
1. **Access**: Open your browser and go to your server's address.
2. **Connect**: Link your messenger account in the **Messengers** hub.
3. **Routing**: Manage your sources, emails, and all forwarding rules (Instant/Digest) in the **Routing** tab.
4. **Technical Settings**: Configure SMTP/IMAP servers and security in **Admin Settings**.

---

## 🤝 Contributing
Contributions and suggestions are welcome.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
