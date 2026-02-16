import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api';
import {
    ShieldCheckIcon,
    KeyIcon,
    DocumentTextIcon,
    RocketLaunchIcon,
    LanguageIcon
} from '@heroicons/react/24/outline';

export default function Setup() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState({
        telegram_api_id: '',
        telegram_api_hash: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await adminAPI.updateSettings(settings);
            // Verify it's actually complete (backend sets setup_complete after save)
            const check = await adminAPI.getSettings();
            if (check.data.setup_complete) {
                navigate('/');
            } else {
                setError('Setup incomplete. Please check keys.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to complete setup');
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'fa' : 'en';
        i18n.changeLanguage(newLang);
        document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="absolute top-8 right-8">
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all font-bold text-sm text-gray-600"
                >
                    <LanguageIcon className="h-5 w-5" />
                    {i18n.language === 'en' ? 'فارسی' : 'English'}
                </button>
            </div>

            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-gray-100 overflow-hidden">
                    <div className="relative h-40 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center px-8 overflow-hidden">
                        <RocketLaunchIcon className="absolute -bottom-10 -right-10 h-64 w-64 text-white/10 rotate-12" />
                        <div className="relative text-center">
                            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">{t('setupWelcome')}</h1>
                            <p className="mt-2 text-blue-100 font-medium">{t('setupDesc')}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-10">
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                    {t('telegramApiId')}
                                </label>
                                <div className="relative">
                                    <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={settings.telegram_api_id}
                                        onChange={e => setSettings({ ...settings, telegram_api_id: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-mono font-bold text-gray-700 placeholder:font-sans placeholder:font-normal"
                                        placeholder="1234567"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                    {t('telegramApiHash')}
                                </label>
                                <div className="relative">
                                    <DocumentTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={settings.telegram_api_hash}
                                        onChange={e => setSettings({ ...settings, telegram_api_hash: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-mono font-bold text-gray-700 placeholder:font-sans placeholder:font-normal"
                                        placeholder="abc123def456..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SMTP Section */}
                        <div className="space-y-6 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('smtpSettings')} <span className="text-gray-400 text-[10px]">(Optional)</span></h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                        {t('smtpServer')}
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.smtp_server || ''}
                                        onChange={e => setSettings({ ...settings, smtp_server: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 transition-all font-bold text-gray-700"
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                        {t('smtpPort')}
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.smtp_port || ''}
                                        onChange={e => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 transition-all font-bold text-gray-700"
                                        placeholder="587"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                        {t('smtpUsername')}
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.smtp_username || ''}
                                        onChange={e => setSettings({ ...settings, smtp_username: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 transition-all font-bold text-gray-700"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-blue-600 transition-colors">
                                        {t('smtpPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.smtp_password || ''}
                                        onChange={e => setSettings({ ...settings, smtp_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 transition-all font-bold text-gray-700"
                                        placeholder="App Password"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <ShieldCheckIcon className="h-5 w-5 shrink-0" />
                                <span className="text-sm font-bold">{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0"
                            >
                                {loading ? t('loading') : t('completeSetup')}
                            </button>

                            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Don't have them? Get them from <a href="https://my.telegram.org" target="_blank" className="text-blue-500 hover:underline">my.telegram.org</a>
                            </p>
                        </div>
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                    <div className="h-px flex-1 bg-gray-300"></div>
                    <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
                    <div className="h-px flex-1 bg-gray-300"></div>
                </div>
            </div>
        </div>
    );
}
