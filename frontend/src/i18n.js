import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            // Navigation
            dashboard: 'Dashboard',
            messengers: 'Messengers',
            routing: 'Routing',
            logs: 'Logs',
            admin: 'Admin Settings',
            accounts: 'Accounts',
            logout: 'Logout',

            // Auth
            login: 'Login',
            username: 'Username',
            password: 'Password',
            changePassword: 'Change Password',
            currentPassword: 'Current Password',
            newPassword: 'New Password',

            // Messengers
            messengerLogin: 'Messenger Login',
            phoneNumber: 'Phone Number',
            sendCode: 'Send Code',
            verificationCode: 'Verification Code',
            twoFactorPassword: '2FA Password (if enabled)',
            completeLogin: 'Complete Login',
            messengerStatus: 'Messenger Status',
            connected: 'Connected',
            disconnected: 'Disconnected',

            // Routing
            routingRules: 'Routing Rules',
            addRule: 'Add Rule',
            instant: 'Instant',
            digest: 'Digest',
            forwardingType: 'Forwarding Mode',
            sources: 'Sources',
            addSource: 'Add Source',
            sourceType: 'Source Type',
            channel: 'Channel',
            group: 'Group',
            privateChat: 'Private Chat',
            sourceId: 'Source ID/Username',
            sourceName: 'Source Name',
            emails: 'Target Emails',
            addEmail: 'Add Email',
            email: 'Email',
            emailMappings: 'Email-Source Mappings',
            selectSources: 'Select sources for this email',
            selectDestination: 'Select Destination',
            from: 'From',
            to: 'To',

            // Schedule
            schedule: 'Schedule',
            scheduleInterval: 'Interval (minutes)',
            scheduleEnabled: 'Enabled',
            startScheduler: 'Start Scheduler',
            stopScheduler: 'Stop Scheduler',
            lastRun: 'Last Run',

            // Admin Settings
            smtpSettings: 'SMTP Settings',
            smtpServer: 'SMTP Server',
            smtpPort: 'SMTP Port',
            smtpUsername: 'SMTP Username',
            smtpPassword: 'SMTP Password',
            webPort: 'Web Port',
            sslCertPath: 'SSL Certificate Path',
            sslKeyPath: 'SSL Key Path',
            fetchDialogs: 'Fetch from Messenger',
            searchDialogs: 'Search chats...',
            noDialogs: 'No chats found.',
            added: 'Added',
            alreadyAdded: 'Already Added',

            sslSettings: 'SSL Settings',
            uploadCertificate: 'Upload Certificate',
            fullchainFile: 'Fullchain File (fullchain.pem)',
            privkeyFile: 'Private Key File (privkey.pem)',
            sslEnabled: 'SSL Enabled',

            forwardVideos: 'Forward Videos',
            forwardFiles: 'Forward Other Files',
            maxVideoSize: 'Max Video Size (MB)',

            downloadLogs: 'Download Logs',
            backendLogs: 'Backend Logs',
            frontendLogs: 'Frontend Logs',

            // Security
            security: 'Security',
            twoFactorAuth: 'Two-Factor Authentication',
            twoFactorStatus: '2FA Status',
            enable2FA: 'Enable 2FA',
            disable2FA: 'Disable 2FA',
            setup2FA: 'Setup 2FA',
            scanQR: 'Scan this QR code with your authenticator app',
            verifyCode: 'Verify Code',
            enter2FACode: 'Enter 6-digit 2FA code',
            sessionTimeout: 'Session timeout is 5 minutes for your security.',

            // Bidirectional
            bidirectional: 'Bidirectional (Email to Messenger)',
            imapSettings: 'IMAP Settings (Inbound)',
            imapServer: 'IMAP Server',
            imapPort: 'IMAP Port',
            imapUsername: 'IMAP Username',
            imapPassword: 'IMAP Password',
            imapEnabled: 'Enable Inbound Email Checking',
            targetChat: 'Target Messenger Chat',
            routingTable: 'Routing Table',
            source: 'Source (ID/Email)',
            destination: 'Destination (Email/ID)',
            saveSSLSettings: 'Save SSL Configuration',
            secretKey: 'TOTP Secret Key',

            // Actions
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            add: 'Add',
            update: 'Update',
            upload: 'Upload',
            download: 'Download',

            // Messages
            success: 'Success',
            error: 'Error',
            loading: 'Loading...',
            noData: 'No data available',
            welcome: 'Welcome',
            welcomeDesc: 'Welcome to the new messenger2mail Admin Panel. Use the sidebar to manage your Messenger sources, routing rules, and scheduling configuration.',

            // Accounts
            addAccount: 'Add Account',
            accountName: 'Account Name',
            accountType: 'Account Type',
            telegramAccount: 'Telegram Account',
            emailImapAccount: 'Email (IMAP)',
            emailSmtpAccount: 'Email (SMTP)',
            noAccounts: 'No accounts added yet.',
            loginRequired: 'Login Required',
            connected: 'Connected',
            actions: 'Actions',
            active: 'Active',
            systemActive: 'System Active',
            systemIdle: 'System Idle',
            realTimeForwarding: 'Real-time Forwarding',
            ruleEngine: 'Rule Engine',
            running: 'Running',
            idle: 'Idle',
            viewDocumentation: 'View Documentation',
            systemHealth: 'System Health',
            host: 'Host',
            port: 'Port',
            messagesProcessed: 'Messages Processed',
            setupWizard: 'Setup Wizard',
            setupWelcome: 'Initial System Setup',
            setupDesc: 'Please provide your Telegram API credentials to enable the messenger core.',
            telegramApiId: 'Telegram API ID',
            telegramApiHash: 'Telegram API Hash',
            completeSetup: 'Complete Setup',
            setupSuccess: 'Setup completed successfully!',
            testConnection: 'Test Connection',
            testing: 'Testing...',

            // Dashboard new
            dashboardTitle: 'System Overview',
            dashboardDesc: 'Your intelligent bridge between Telegram and Email. Monitor status, manage forwarding rules, and track performance in real-time.',
            online: 'Online',
            offline: 'Offline',
            processedMessages: 'Processed Messages',
            activeRules: 'Active Rules',
            serviceStatus: 'Service Status',
            uptime: 'Uptime',
            version: 'Version',
        }
    },
    fa: {
        translation: {
            // Navigation
            dashboard: 'داشبورد',
            messengers: 'پیام‌رسان‌ها',
            routing: 'مسیریابی (Routing)',
            logs: 'گزارش‌ها',
            admin: 'تنظیمات مدیریت',
            accounts: 'اکانت‌ها',
            logout: 'خروج',

            // Auth
            login: 'ورود',
            username: 'نام کاربری',
            password: 'رمز عبور',
            changePassword: 'تغییر رمز عبور',
            currentPassword: 'رمز عبور فعلی',
            newPassword: 'رمز عبور جدید',

            // Messengers
            messengerLogin: 'ورود به پیام‌رسان',
            phoneNumber: 'شماره تلفن',
            sendCode: 'ارسال کد',
            verificationCode: 'کد تایید',
            twoFactorPassword: 'رمز دو مرحله‌ای (در صورت فعال بودن)',
            completeLogin: 'تکمیل ورود',
            messengerStatus: 'وضعیت اتصال',
            connected: 'متصل',
            disconnected: 'قطع',

            // Routing
            routingRules: 'قوانین مسیریابی',
            addRule: 'افزودن قانون',
            instant: 'لحظه‌ای (Instant)',
            digest: 'دوره‌ای (Digest)',
            forwardingType: 'حالت ارسال',
            sources: 'منابع',
            addSource: 'افزودن منبع',
            sourceType: 'نوع منبع',
            channel: 'کانال',
            group: 'گروه',
            privateChat: 'چت خصوصی',
            sourceId: 'شناسه/نام کاربری منبع',
            sourceName: 'نام منبع',
            emails: 'ایمیل‌های مقصد',
            addEmail: 'افزودن ایمیل',
            email: 'ایمیل',
            emailMappings: 'نگاشت ایمیل-منبع',
            selectSources: 'منابع را برای این ایمیل انتخاب کنید',
            selectDestination: 'انتخاب مقصد',
            from: 'از',
            to: 'به',

            // Schedule
            schedule: 'زمان‌بندی',
            scheduleInterval: 'فاصله زمانی (دقیقه)',
            scheduleEnabled: 'فعال',
            startScheduler: 'شروع زمان‌بند',
            stopScheduler: 'توقف زمان‌بند',
            lastRun: 'آخرین اجرا',

            // Admin Settings
            smtpSettings: 'تنظیمات SMTP',
            smtpServer: 'سرور SMTP',
            smtpPort: 'پورت SMTP',
            smtpUsername: 'نام کاربری SMTP',
            smtpPassword: 'رمز عبور SMTP',
            webPort: 'پورت وب',
            sslCertPath: 'مسیر گواهی SSL',
            sslKeyPath: 'مسیر کلید SSL',
            fetchDialogs: 'دریافت از پیام‌رسان',
            searchDialogs: 'جستجوی چت‌ها...',
            noDialogs: 'چتی یافت نشد.',
            added: 'اضافه شد',
            alreadyAdded: 'قبلاً اضافه شده',

            sslSettings: 'تنظیمات SSL',
            uploadCertificate: 'آپلود گواهی',
            fullchainFile: 'فایل زنجیره کامل (fullchain.pem)',
            privkeyFile: 'فایل کلید خصوصی (privkey.pem)',
            sslEnabled: 'SSL فعال',

            forwardVideos: 'ارسال ویدیوها',
            forwardFiles: 'ارسال سایر فایل‌ها',
            maxVideoSize: 'سقف حجم ویدیو (MB)',

            downloadLogs: 'دانلود گزارش‌ها',
            backendLogs: 'گزارش‌های بکند',
            frontendLogs: 'گزارش‌های فرانتند',

            // Security
            security: 'امنیت',
            twoFactorAuth: 'تایید دو مرحله‌ای (2FA)',
            twoFactorStatus: 'وضعیت 2FA',
            enable2FA: 'فعالسازی 2FA',
            disable2FA: 'غیرفعالسازی 2FA',
            setup2FA: 'راه‌اندازی 2FA',
            scanQR: 'این کد QR را با اپلیکیشن تایید هویت اسکن کنید',
            verifyCode: 'تایید کد',
            enter2FACode: 'کد ۶ رقمی را وارد کنید',
            sessionTimeout: 'جهت امنیت شما، زمان سشن ۵ دقیقه است.',

            // Bidirectional
            bidirectional: 'ارسال دوطرفه (ایمیل به پیام‌رسان)',
            imapSettings: 'تنظیمات IMAP (ورودی)',
            imapServer: 'سرور IMAP',
            imapPort: 'پورت IMAP',
            imapUsername: 'نام کاربری IMAP',
            imapPassword: 'رمز عبور IMAP',
            imapEnabled: 'فعالسازی بررسی ایمیل‌های ورودی',
            targetChat: 'چت مقصد در پیام‌رسان',
            routingTable: 'جدول مسیریابی',
            source: 'منبع (شناسه یا ایمیل)',
            destination: 'مقصد (ایمیل یا شناسه)',
            saveSSLSettings: 'ذخیره تنظیمات SSL',
            secretKey: 'کلید متنی پشتیبان 2FA',

            // Actions
            save: 'ذخیره',
            cancel: 'انصراف',
            delete: 'حذف',
            add: 'افزودن',
            update: 'بروزرسانی',
            upload: 'آپلود',
            download: 'دانلود',

            // Messages
            success: 'موفقیت',
            error: 'خطا',
            loading: 'در حال بارگذاری...',
            noData: 'داده‌ای موجود نیست',
            welcome: 'خوش آمدید',
            welcomeDesc: 'به پنل مدیریت جدید messenger2mail خوش آمدید. از منوی کناری برای مدیریت منابع پیام‌رسان، قوانین مسیریابی و تنظیمات زمان‌بندی استفاده کنید.',

            // Accounts
            addAccount: 'افزودن اکانت',
            accountName: 'نام اکانت',
            accountType: 'نوع اکانت',
            telegramAccount: 'اکانت تلگرام',
            emailImapAccount: 'ایمیل (IMAP)',
            emailSmtpAccount: 'ایمیل (SMTP)',
            noAccounts: 'هنوز اکانتی اضافه نشده است.',
            loginRequired: 'نیاز به ورود',
            connected: 'متصل',
            actions: 'عملیات',
            active: 'فعال',
            systemActive: 'سیستم فعال',
            systemIdle: 'سیستم در انتظار',
            realTimeForwarding: 'ارسال آنی',
            ruleEngine: 'موتور قوانین',
            running: 'در حال اجرا',
            idle: 'آماده به کار',
            viewDocumentation: 'مشاهده مستندات',
            systemHealth: 'سلامت سیستم',
            host: 'هاست',
            port: 'پورت',
            messagesProcessed: 'پیام‌های پردازش شده',
            setupWizard: 'مراحل راه‌اندازی',
            setupWelcome: 'راه‌اندازی اولیه سیستم',
            setupDesc: 'لطفاً شناسه‌های API تلگرام خود را برای فعال‌سازی هسته پیام‌رسان وارد کنید.',
            telegramApiId: 'Telegram API ID',
            telegramApiHash: 'Telegram API Hash',
            completeSetup: 'تکمیل راه‌اندازی',
            setupSuccess: 'راه‌اندازی با موفقیت انجام شد!',
            testConnection: 'تست اتصال',
            testing: 'در حال تست...',

            // Dashboard new
            dashboardTitle: 'نمای کلی سیستم',
            dashboardDesc: 'پل هوشمند بین تلگرام و ایمیل. پایش وضعیت، مدیریت قوانین ارسال و پیگیری عملکرد در زمان واقعی.',
            online: 'آنلاین',
            offline: 'آفلاین',
            processedMessages: 'پیام‌های پردازش شده',
            activeRules: 'قوانین فعال',
            serviceStatus: 'وضعیت سرویس',
            uptime: 'آپ‌تایم',
            version: 'نسخه',
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
