import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI, authAPI } from '../api';
import {
    ArrowDownTrayIcon,
    LockClosedIcon,
    ShieldCheckIcon,
    KeyIcon,
    GlobeAltIcon,
    FingerPrintIcon,
    CircleStackIcon,
    CloudIcon,
    ShieldExclamationIcon
} from '@heroicons/react/24/outline';

export default function AdminSettings() {
    const { t } = useTranslation();

    // States
    const [settings, setSettings] = useState({
        web_port: 80,
        ssl_enabled: false,
        telegram_api_id: '',
        telegram_api_hash: '',
        forward_videos: true,
        forward_files: true,
        max_video_size_mb: 10
    });
    const [passwords, setPasswords] = useState({ current: '', new: '' });
    const [sslInfo, setSslInfo] = useState(null);
    const [userInfo, setUserInfo] = useState({ username: '', two_factor_enabled: false });

    // 2FA state
    const [twoFactorSetup, setTwoFactorSetup] = useState(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [loading2FA, setLoading2FA] = useState(false);

    const [loadingSettings, setLoadingSettings] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);

    useEffect(() => {
        fetchData();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await authAPI.getMe();
            setUserInfo(res.data);
        } catch (err) {
            console.error('Failed to fetch user info', err);
        }
    };

    const fetchData = async () => {
        try {
            const [settingsRes, sslRes] = await Promise.all([
                adminAPI.getSettings(),
                adminAPI.getSSLInfo()
            ]);
            setSettings(settingsRes.data);
            setSslInfo(sslRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data', err);
        }
    };

    // 2FA Handlers
    const handle2FASetup = async () => {
        setLoading2FA(true);
        try {
            const res = await authAPI.setup2FA();
            setTwoFactorSetup(res.data);
        } catch (err) {
            alert(t('error'));
        } finally {
            setLoading2FA(false);
        }
    };

    const handle2FAEnable = async () => {
        setLoading2FA(true);
        try {
            await authAPI.enable2FA(twoFactorCode);
            alert(t('success'));
            setTwoFactorSetup(null);
            setTwoFactorCode('');
            await fetchUser();
        } catch (err) {
            alert(err.response?.data?.detail || t('error'));
        } finally {
            setLoading2FA(false);
        }
    };

    const handle2FADisable = async () => {
        if (!window.confirm(t('disable2FA') + '?')) return;
        const code = window.prompt(t('enter2FACode'));
        if (!code) return;

        setLoading2FA(true);
        try {
            await authAPI.disable2FA(code);
            alert(t('success'));
            await fetchUser();
        } catch (err) {
            alert(err.response?.data?.detail || t('error'));
        } finally {
            setLoading2FA(false);
        }
    };

    // Settings Handlers
    const handleSettingsUpdate = async (e) => {
        e.preventDefault();
        setLoadingSettings(true);
        try {
            await adminAPI.updateSettings({
                web_port: parseInt(settings.web_port),
                telegram_api_id: settings.telegram_api_id,
                telegram_api_hash: settings.telegram_api_hash,
                ssl_enabled: settings.ssl_enabled,
                ssl_cert_path: settings.ssl_cert_path,
                ssl_key_path: settings.ssl_key_path,
                forward_videos: settings.forward_videos,
                forward_files: settings.forward_files,
                max_video_size_mb: parseInt(settings.max_video_size_mb)
            });
            alert(t('success'));
            await fetchData();
        } catch (err) {
            alert(t('error'));
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoadingPassword(true);
        try {
            await authAPI.changePassword(passwords.current, passwords.new);
            setPasswords({ current: '', new: '' });
            alert(t('success'));
        } catch (err) {
            alert(err.response?.data?.detail || t('error'));
        } finally {
            setLoadingPassword(false);
        }
    };

    const downloadLog = async (type) => {
        try {
            const response = type === 'backend'
                ? await adminAPI.downloadBackendLogs()
                : await adminAPI.downloadFrontendLogs();

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}.log`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert(t('error'));
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in text-gray-900">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('admin')}</h1>
                <p className="mt-2 text-sm text-gray-500">Global system parameters and security controls.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Security (2FA & Password) */}
                <div className="space-y-10">
                    <div className="bg-white shadow-2xl shadow-rose-500/5 rounded-[2.5rem] border border-gray-100 overflow-hidden">
                        <div className="px-8 py-5 bg-rose-50/50 border-b border-rose-50 flex items-center gap-3">
                            <FingerPrintIcon className="h-6 w-6 text-rose-600" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-rose-600">{t('security')}</h2>
                        </div>
                        <div className="p-8 space-y-8">
                            {/* 2FA Status */}
                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('twoFactorStatus')}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${userInfo.two_factor_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                        <span className={`text-sm font-black uppercase ${userInfo.two_factor_enabled ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {userInfo.two_factor_enabled ? t('connected') : t('disconnected')}
                                        </span>
                                    </div>
                                </div>
                                {userInfo.two_factor_enabled ? (
                                    <button onClick={handle2FADisable} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black uppercase hover:bg-rose-200 transition-all">
                                        {t('disable2FA')}
                                    </button>
                                ) : (
                                    !twoFactorSetup && (
                                        <button onClick={handle2FASetup} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                            {t('enable2FA')}
                                        </button>
                                    )
                                )}
                            </div>

                            {/* 2FA Setup Flow */}
                            {twoFactorSetup && (
                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-5 animate-in slide-in-from-top-4">
                                    <p className="text-xs font-bold text-blue-800 text-center">{t('scanQR')}</p>
                                    <div className="flex justify-center">
                                        <div className="p-3 bg-white rounded-2xl shadow-lg border border-blue-100">
                                            <img src={twoFactorSetup.qr_code} alt="QR" className="w-40 h-40" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            maxLength="6"
                                            value={twoFactorCode}
                                            onChange={e => setTwoFactorCode(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-0 ring-1 ring-blue-200 rounded-xl focus:ring-2 focus:ring-blue-600 text-center font-black tracking-[0.5em] text-blue-900"
                                            placeholder="000000"
                                        />
                                        <button onClick={handle2FAEnable} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">
                                            {t('verifyCode')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Password Change */}
                            <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-gray-50">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('changePassword')}</label>
                                    <div className="space-y-3">
                                        <input
                                            type="password"
                                            placeholder={t('currentPassword')}
                                            value={passwords.current}
                                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                                        />
                                        <input
                                            type="password"
                                            placeholder={t('newPassword')}
                                            value={passwords.new}
                                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                                    {t('update')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Network & Environment */}
                <div className="bg-white shadow-2xl shadow-emerald-500/5 rounded-[2.5rem] border border-gray-100 overflow-hidden">
                    <div className="px-8 py-5 bg-emerald-50/50 border-b border-emerald-50 flex items-center gap-3">
                        <GlobeAltIcon className="h-6 w-6 text-emerald-600" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-emerald-600">Environment & SSL</h2>
                    </div>
                    <div className="p-8 space-y-8">
                        {/* SSL Status */}
                        <div className={`p-6 rounded-[2rem] border-2 flex items-start gap-5 ${settings.ssl_enabled ? 'bg-emerald-50/30 border-emerald-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                            {settings.ssl_enabled ? <ShieldCheckIcon className="h-8 w-8 text-emerald-500" /> : <ShieldExclamationIcon className="h-8 w-8 text-gray-400" />}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-black uppercase text-xs text-gray-900">{t('sslSettings')}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${settings.ssl_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                                        {settings.ssl_enabled ? t('active') : t('idle')}
                                    </span>
                                </div>
                                {sslInfo && sslInfo.exists ? (
                                    <div className="space-y-1 text-xs">
                                        <p className="text-gray-500 italic">{sslInfo.domain}</p>
                                        <p className="text-[10px] font-bold text-gray-400">EXPIRES: {new Date(sslInfo.expires_at).toLocaleDateString()}</p>
                                    </div>
                                ) : <p className="text-[10px] text-gray-400">No active certificate detected.</p>}
                            </div>
                        </div>

                        <form onSubmit={handleSettingsUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="flex flex-col justify-end pb-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${settings.ssl_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`bg-white w-4 h-4 rounded-full transition-all transform ${settings.ssl_enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.ssl_enabled}
                                            onChange={e => setSettings({ ...settings, ssl_enabled: e.target.checked })}
                                        />
                                        <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-gray-900 transition-colors">{t('sslEnabled')}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Media Controls</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, forward_videos: !settings.forward_videos })}
                                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${settings.forward_videos ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                    >
                                        {t('forwardVideos')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, forward_files: !settings.forward_files })}
                                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${settings.forward_files ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                    >
                                        {t('forwardFiles')}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('maxVideoSize')}</label>
                                    <input
                                        type="number"
                                        value={settings.max_video_size_mb}
                                        onChange={e => setSettings({ ...settings, max_video_size_mb: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 font-bold"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all">
                                {t('save')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Maintenance & Logs */}
                <div className="bg-white shadow-2xl shadow-indigo-500/5 rounded-[2.5rem] border border-gray-100 overflow-hidden">
                    <div className="px-8 py-5 bg-indigo-50/50 border-b border-indigo-50 flex items-center gap-3">
                        <CircleStackIcon className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">Maintenance</h2>
                    </div>
                    <div className="p-8 space-y-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 group">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">System Logging</p>
                                <button
                                    onClick={() => downloadLog('backend')}
                                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 group-hover:border-indigo-500 transition-all shadow-sm"
                                >
                                    <span className="text-sm font-black text-gray-700">{t('backendLogs')}</span>
                                    <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
                                </button>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 group">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Frontend Logging</p>
                                <button
                                    onClick={() => downloadLog('frontend')}
                                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 group-hover:border-indigo-500 transition-all shadow-sm"
                                >
                                    <span className="text-sm font-black text-gray-700">{t('frontendLogs')}</span>
                                    <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 bg-indigo-900 rounded-[2.5rem] text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-lg font-black mb-2">System Version</h3>
                                <p className="text-indigo-200 text-xs font-bold font-mono">v2.1.0-ENTERPRISE</p>
                                <div className="mt-8 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Auto-update enabled</span>
                                </div>
                            </div>
                            <CloudIcon className="absolute -bottom-10 -right-10 h-64 w-64 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
