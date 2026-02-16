import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountsAPI } from '../api';
import {
    PlusIcon,
    TrashIcon,
    UserCircleIcon,
    EnvelopeIcon,
    SignalIcon,
    ShieldCheckIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    KeyIcon,
    ServerIcon
} from '@heroicons/react/24/outline';

export default function Accounts() {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newAccount, setNewAccount] = useState({ name: '', account_type: 'telegram' });

    // Modal state for Email Credentials
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailCreds, setEmailCreds] = useState({ host: '', port: '', user: '', password: '' });

    // Login flow state for Telegram
    const [loginState, setLoginState] = useState({
        accountId: null,
        step: 'phone', // 'phone', 'code', 'password'
        phone: '',
        code: '',
        password: '',
        loading: false,
        error: ''
    });

    useEffect(() => {
        fetchAccounts();
        const timer = setInterval(fetchAccounts, 10000); // Auto-refresh status
        return () => clearInterval(timer);
    }, []);

    const fetchAccounts = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await accountsAPI.getAccounts();
            setAccounts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (newAccount.account_type.startsWith('email_')) {
            setShowEmailModal(true);
            return;
        }
        submitAccount();
    };

    const submitAccount = async (creds = null) => {
        setLoading(true);
        try {
            const data = {
                ...newAccount,
                credentials_json: creds ? JSON.stringify(creds) : null
            };
            await accountsAPI.addAccount(data);
            setNewAccount({ name: '', account_type: 'telegram' });
            setShowEmailModal(false);
            setEmailCreds({ host: '', port: '', user: '', password: '' });
            fetchAccounts(true);
        } catch (err) {
            alert(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('delete') + '?')) return;
        try {
            await accountsAPI.deleteAccount(id);
            fetchAccounts();
        } catch (err) {
            alert(t('error'));
        }
    };

    const initiationLogin = (id) => {
        setLoginState({
            accountId: id,
            step: 'phone',
            phone: '',
            code: '',
            password: '',
            loading: false,
            error: ''
        });
    };

    const handleSendCode = async () => {
        setLoginState(s => ({ ...s, loading: true, error: '' }));
        try {
            await accountsAPI.sendTelegramCode({
                account_id: loginState.accountId,
                phone: loginState.phone
            });
            setLoginState(s => ({ ...s, step: 'code', loading: false }));
        } catch (err) {
            setLoginState(s => ({ ...s, error: err.response?.data?.detail || 'Failed to send code', loading: false }));
        }
    };

    const handleVerifyCode = async () => {
        setLoginState(s => ({ ...s, loading: true, error: '' }));
        try {
            const res = await accountsAPI.loginTelegram({
                account_id: loginState.accountId,
                code: loginState.code,
                password: loginState.password
            });

            if (res.data.status === 'success') {
                setLoginState({ accountId: null, step: 'phone', phone: '', code: '', password: '', loading: false, error: '' });
                fetchAccounts(true);
            } else if (res.data.status === '2fa_required') {
                setLoginState(s => ({ ...s, step: 'password', loading: false }));
            } else {
                setLoginState(s => ({ ...s, error: res.data.message || 'Login failed', loading: false }));
            }
        } catch (err) {
            const detail = err.response?.data?.detail || 'Login failed';
            setLoginState(s => ({ ...s, error: detail, loading: false }));
        }
    };

    const handleTestConnection = async (id) => {
        try {
            const res = await accountsAPI.testAccount(id);
            if (res.data.status === 'success') {
                alert('Success: ' + res.data.message);
            } else {
                alert('Connection Failed: ' + res.data.message);
            }
        } catch (err) {
            alert('Test Error: ' + (err.response?.data?.detail || 'Failed to connect'));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('accounts')}</h1>
                    <p className="mt-2 text-sm text-gray-500">Manage all your communication nodes and their specific credentials.</p>
                </div>
            </div>

            {/* Premium Add Account Section */}
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t('addAccount')}</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleAddAccount} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder={t('accountName')}
                                value={newAccount.name}
                                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 transition-all duration-200"
                                required
                            />
                        </div>
                        <div className="md:w-64">
                            <select
                                value={newAccount.account_type}
                                onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 transition-all duration-200 cursor-pointer font-semibold"
                            >
                                <option value="telegram">{t('telegramAccount')}</option>
                                <option value="email_imap">{t('emailImapAccount')}</option>
                                <option value="email_smtp">{t('emailSmtpAccount')}</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('add')}
                        </button>
                    </form>
                </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(account => (
                    <div key={account.id} className="relative group bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[220px]">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            {account.is_active ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tighter rounded-full border border-emerald-100">
                                    <CheckCircleIcon className="h-3.5 w-3.5" /> {t('connected')}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-tighter rounded-full border border-amber-100">
                                    <ExclamationCircleIcon className="h-3.5 w-3.5" /> {t('disconnected')}
                                </span>
                            )}
                        </div>

                        {/* Icon & Type */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${account.account_type === 'telegram' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            {account.account_type === 'telegram' ? <SignalIcon className="h-8 w-8" /> : <EnvelopeIcon className="h-8 w-8" />}
                        </div>

                        <div className="mb-6 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                                {t(account.account_type === 'telegram' ? 'telegramAccount' : account.account_type.includes('imap') ? 'emailImapAccount' : 'emailSmtpAccount')}
                            </p>
                            <h3 className="text-xl font-black text-gray-900 truncate leading-tight">{account.name}</h3>
                        </div>

                        {/* Login Logic Box */}
                        {account.account_type === 'telegram' && !account.is_active && (
                            <div className="mt-auto">
                                {loginState.accountId === account.id ? (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top-2">
                                        {loginState.step === 'phone' && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="+1234..."
                                                    value={loginState.phone}
                                                    onChange={e => setLoginState(s => ({ ...s, phone: e.target.value }))}
                                                    className="flex-1 px-4 py-2 text-sm border-0 bg-white ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button onClick={handleSendCode} disabled={loginState.loading} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}
                                        {loginState.step === 'code' && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="12345"
                                                    value={loginState.code}
                                                    onChange={e => setLoginState(s => ({ ...s, code: e.target.value }))}
                                                    className="flex-1 px-4 py-2 text-sm border-0 bg-white ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button onClick={handleVerifyCode} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20">
                                                    {t('login')}
                                                </button>
                                            </div>
                                        )}
                                        {loginState.step === 'password' && (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="password"
                                                    placeholder="Cloud Password"
                                                    value={loginState.password}
                                                    onChange={e => setLoginState(s => ({ ...s, password: e.target.value }))}
                                                    className="w-full px-4 py-2 text-sm border-0 bg-white ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button onClick={handleVerifyCode} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20">
                                                    {t('login')}
                                                </button>
                                            </div>
                                        )}
                                        {loginState.error && <p className="text-xs text-red-600 font-bold px-1">{loginState.error}</p>}
                                        <button onClick={() => setLoginState({ ...loginState, accountId: null })} className="text-[10px] font-bold uppercase text-gray-500 hover:text-gray-900 w-full text-center transition-colors">
                                            {t('cancel')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => initiationLogin(account.id)}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                                    >
                                        <ShieldCheckIcon className="h-5 w-5 inline mr-2" /> {t('loginRequired')}
                                    </button>
                                )}
                            </div>
                        )}

                        {account.account_type.startsWith('email') && (
                            <div className="mt-auto">
                                <button
                                    onClick={() => handleTestConnection(account.id)}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <ServerIcon className="h-5 w-5" /> {t('testConnection')}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => handleDelete(account.id)}
                            className="absolute bottom-6 right-6 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-red-50"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Email Credentials Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-black text-gray-900 mb-2">{t('imapSettings')}</h2>
                            <p className="text-sm text-gray-500 mb-8">Enter access details for <span className="text-blue-600 font-bold">{newAccount.name}</span></p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">{t('host')}</label>
                                        <input
                                            type="text"
                                            value={emailCreds.host}
                                            onChange={e => setEmailCreds({ ...emailCreds, host: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600"
                                            placeholder="imap.gmail.com"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">{t('port')}</label>
                                        <input
                                            type="text"
                                            value={emailCreds.port}
                                            onChange={e => setEmailCreds({ ...emailCreds, port: e.target.value })}
                                            className="w-full px-3 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600"
                                            placeholder="993"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">{t('user')}</label>
                                    <input
                                        type="text"
                                        value={emailCreds.user}
                                        onChange={e => setEmailCreds({ ...emailCreds, user: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600"
                                        placeholder="me@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">{t('password')}</label>
                                    <input
                                        type="password"
                                        value={emailCreds.password}
                                        onChange={e => setEmailCreds({ ...emailCreds, password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <button
                                    onClick={() => setShowEmailModal(false)}
                                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl transition-all"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={() => submitAccount(emailCreds)}
                                    className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {accounts.length === 0 && (
                <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                    <UserCircleIcon className="h-20 w-16 text-gray-200 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-gray-900">{t('noAccounts')}</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 italic">Start by adding your first Telegram, IMAP or SMTP node above.</p>
                </div>
            )}
        </div>
    );
}
