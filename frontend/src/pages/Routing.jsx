import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { routingAPI, accountsAPI } from '../api';
import {
    TrashIcon,
    PlusIcon,
    ArrowRightIcon,
    ClockIcon,
    BoltIcon,
    ServerIcon,
    AdjustmentsHorizontalIcon,
    CheckCircleIcon,
    XCircleIcon,
    MagnifyingGlassIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

export default function Routing() {
    const { t } = useTranslation();
    const [rules, setRules] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Rule Builder State
    const [newRule, setNewRule] = useState({
        name: '',
        source_account_id: '',
        destination_account_id: '',
        source_filter_json: '[]',
        destination_config_json: '{}',
        forwarding_type: 'instant',
        interval_minutes: 5,
        enabled: true
    });

    const [sourceFilter, setSourceFilter] = useState('');
    const [destinationConfig, setDestinationConfig] = useState({ email: '', chat_id: '' });

    const [dialogs, setDialogs] = useState([]);
    const [fetchingDialogs, setFetchingDialogs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleFetchDialogs = async () => {
        if (!newRule.source_account_id) return;
        setFetchingDialogs(true);
        try {
            const res = await accountsAPI.getDialogs(newRule.source_account_id);
            setDialogs(res.data || []);
        } catch (err) {
            alert(t('error'));
        } finally {
            setFetchingDialogs(false);
        }
    };

    const addDialogToFilter = (id) => {
        const current = sourceFilter ? sourceFilter.split(',').map(s => s.trim()) : [];
        if (!current.includes(id)) {
            const next = [...current, id].filter(s => s).join(', ');
            setSourceFilter(next);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ruleRes, accRes] = await Promise.all([
                routingAPI.getRules(),
                accountsAPI.getAccounts()
            ]);
            setRules(ruleRes.data || []);
            setAccounts(accRes.data || []);
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const ruleToSave = {
                ...newRule,
                source_filter_json: JSON.stringify(sourceFilter.split(',').map(s => s.trim()).filter(s => s)),
                destination_config_json: JSON.stringify(destinationConfig)
            };
            await routingAPI.addRule(ruleToSave);
            setNewRule({
                name: '',
                source_account_id: '',
                destination_account_id: '',
                source_filter_json: '[]',
                destination_config_json: '{}',
                forwarding_type: 'instant',
                interval_minutes: 5,
                enabled: true
            });
            setSourceFilter('');
            setDestinationConfig({ email: '', chat_id: '' });
            fetchData();
        } catch (err) {
            alert(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const toggleRuleStatus = async (rule) => {
        try {
            await routingAPI.updateRule(rule.id, { ...rule, enabled: !rule.enabled });
            fetchData();
        } catch (err) {
            alert(t('error'));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('delete') + '?')) return;
        try {
            await routingAPI.deleteRule(id);
            fetchData();
        } catch (err) {
            alert(t('error'));
        }
    };

    const getAccountName = (id) => accounts.find(a => a.id === parseInt(id))?.name || id;

    const filteredDialogs = dialogs.filter(d =>
        d.source_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.source_id.includes(searchTerm)
    );

    return (
        <div className="space-y-10 pb-24 animate-fade-in text-gray-900">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('routing')}</h1>
                <p className="mt-2 text-sm text-gray-500">Create intelligent forwarding paths between your nodes.</p>
            </div>

            {/* Premium Rule Builder */}
            <section className="bg-white shadow-2xl shadow-blue-500/5 rounded-3xl border border-gray-100 overflow-hidden">
                <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <PlusIcon className="h-4 w-4" /> {t('addRule')}
                    </h2>
                </div>
                <form onSubmit={handleAddRule} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Core Definition */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('name')}</label>
                                <input
                                    type="text"
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-semibold"
                                    placeholder="e.g. Work Alerts to Private"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('from')}</label>
                                    <select
                                        value={newRule.source_account_id}
                                        onChange={e => setNewRule({ ...newRule, source_account_id: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 cursor-pointer font-bold text-gray-700"
                                        required
                                    >
                                        <option value="">{t('selectSources')}</option>
                                        {accounts.filter(a => a.is_active || a.account_type === 'email_imap').map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('to')}</label>
                                    <select
                                        value={newRule.destination_account_id}
                                        onChange={e => setNewRule({ ...newRule, destination_account_id: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 cursor-pointer font-bold text-gray-700"
                                        required
                                    >
                                        <option value="">{t('selectDestination')}</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Logic & Filters */}
                        <div className="space-y-6 bg-blue-50/30 p-8 rounded-3xl border border-blue-50">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">{t('sources')}</label>
                                <div className="flex gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={sourceFilter}
                                            onChange={e => setSourceFilter(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-white border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                                            placeholder="-100..., *, user_id"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleFetchDialogs}
                                        disabled={fetchingDialogs || !newRule.source_account_id}
                                        className="px-4 bg-white text-blue-600 border border-blue-100 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {fetchingDialogs ? t('loading') : t('fetchDialogs')}
                                    </button>
                                </div>

                                {dialogs.length > 0 && (
                                    <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                                        <div className="p-2 border-b border-gray-50 flex items-center px-4 bg-gray-50/30">
                                            <MagnifyingGlassIcon className="h-3 w-3 text-gray-400 mr-2" />
                                            <input
                                                type="text"
                                                placeholder={t('searchDialogs')}
                                                className="bg-transparent border-0 text-xs w-full focus:ring-0 p-1"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                                            {filteredDialogs.map(d => (
                                                <div key={d.source_id} className="flex justify-between items-center px-3 py-2 hover:bg-blue-50 rounded-lg group transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700 truncate max-w-[140px]">{d.source_name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">{d.source_id}</span>
                                                    </div>
                                                    <button type="button" onClick={() => addDialogToFilter(d.source_id)} className="text-[10px] font-black uppercase text-blue-600 p-1.5 bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                                                        {t('add')}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">{t('forwardingType')}</label>
                                    <div className="flex bg-white p-1 rounded-xl ring-1 ring-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setNewRule({ ...newRule, forwarding_type: 'instant' })}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newRule.forwarding_type === 'instant' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {t('instant')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewRule({ ...newRule, forwarding_type: 'digest' })}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newRule.forwarding_type === 'digest' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {t('digest')}
                                        </button>
                                    </div>
                                </div>
                                {newRule.forwarding_type === 'digest' && (
                                    <div className="animate-in zoom-in-95">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">{t('scheduleInterval')}</label>
                                        <input
                                            type="number"
                                            value={newRule.interval_minutes}
                                            onChange={e => setNewRule({ ...newRule, interval_minutes: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2.5 bg-white border-0 ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('addRule')}
                        </button>
                    </div>
                </form>
            </section>

            {/* Premium Rule List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <AdjustmentsHorizontalIcon className="h-7 w-7 text-blue-500" /> {t('routingRules')}
                    </h2>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{rules.length} {t('rules')}</span>
                </div>
                <div className="grid grid-cols-1 gap-5">
                    {rules.map(rule => (
                        <div key={rule.id} className="group bg-white p-6 shadow-xl shadow-gray-200/40 rounded-3xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <div className={`p-4 rounded-2xl ${rule.forwarding_type === 'instant' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {rule.forwarding_type === 'instant' ? <BoltIcon className="h-7 w-7" /> : <ClockIcon className="h-7 w-7" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-gray-900 truncate">{rule.name || `Rule #${rule.id}`}</h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                            <ServerIcon className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{getAccountName(rule.source_account_id)}</span>
                                        </div>
                                        <ArrowRightIcon className="h-3 w-3 text-gray-300" />
                                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                            <ServerIcon className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{getAccountName(rule.destination_account_id)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                <div className="text-right flex-1 md:flex-none">
                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('forwardingType')}</div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <span className={`w-1.5 h-1.5 rounded-full ${rule.forwarding_type === 'instant' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                        <span className="text-xs font-black text-gray-700 uppercase">{t(rule.forwarding_type)} {rule.forwarding_type === 'digest' && `(${rule.interval_minutes}m)`}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleRuleStatus(rule)}
                                        className={`p-3 rounded-2xl transition-all ${rule.enabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 shadow-emerald-200/50 shadow-lg' : 'text-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        {rule.enabled ? <CheckCircleIcon className="h-6 w-6" /> : <XCircleIcon className="h-6 w-6" />}
                                    </button>
                                    <button onClick={() => handleDelete(rule.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                        <TrashIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <AdjustmentsHorizontalIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('noData')}</p>
                            <p className="text-xs text-gray-300 mt-1 italic">Define your first forwarding path using the builder above.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
