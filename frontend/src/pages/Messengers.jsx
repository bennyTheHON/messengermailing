import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { telegramAPI } from '../api';

export default function Messengers() {
    const { t } = useTranslation();
    const [status, setStatus] = useState({ connected: false });
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState('phone'); // 'phone', 'code', 'done'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const res = await telegramAPI.getStatus();
            setStatus(res.data);
            if (res.data.connected) {
                setStep('done');
            }
        } catch (err) {
            console.error('Failed to load status', err);
        }
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await telegramAPI.sendCode(phone);
            setStep('code');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await telegramAPI.login(code, password || undefined);
            if (res.data.status === 'success') {
                setStep('done');
                await loadStatus();
            } else if (res.data.status === '2fa_required') {
                setError('2FA password required');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await telegramAPI.logout();
            setStep('phone');
            setPhone('');
            setCode('');
            setPassword('');
            await loadStatus();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to logout');
        }
    };

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('messengers')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Telegram Block */}
                <div className="bg-white shadow rounded-lg p-6 border-t-4 border-blue-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Telegram</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {status.connected ? t('connected') : t('disconnected')}
                        </span>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {step === 'phone' && (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('phoneNumber')}
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="+1234567890"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? t('loading') : t('sendCode')}
                            </button>
                        </form>
                    )}

                    {step === 'code' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('verificationCode')}
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('twoFactorPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? t('loading') : t('completeLogin')}
                            </button>
                        </form>
                    )}

                    {step === 'done' && (
                        <div className="text-center py-4">
                            <div className="text-green-600 text-lg font-medium mb-6 flex items-center justify-center gap-2">
                                <span className="text-2xl">✓</span> {t('connected')}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-6 rounded-lg hover:bg-red-600 hover:text-white transition-all font-medium"
                            >
                                {t('logout')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Future Messengers Placeholder */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-600">Coming Soon</h3>
                    <p className="text-sm text-gray-500 mt-2">WhatsApp, Rubika, Eita & more...</p>
                </div>
            </div>
        </div>
    );
}
