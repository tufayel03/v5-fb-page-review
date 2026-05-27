import React, { useState, useEffect } from "react";
import { RefreshCw, Play, Save, CheckCircle, AlertCircle, FileText } from "lucide-react";

export default function AdminGoogleSheetSync() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [settings, setSettings] = useState({
    id: "",
    enabled: false,
    spreadsheet_id: "",
    sheet_name: "",
    import_type: "Facebook Pages",
    sync_interval: "Manual only",
    last_sync_at: null as string | null,
    last_sync_status: null as string | null,
  });

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings(settings.import_type);
    fetchLogs();
  }, [settings.import_type]);

  const fetchSettings = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/google-sheet-settings?type=${type}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        } else {
          setSettings(prev => ({
            ...prev,
            enabled: false,
            spreadsheet_id: "",
            sheet_name: "",
            sync_interval: "Manual only"
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/google-sheet-logs?type=${encodeURIComponent(settings.import_type)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Extract ID if user provided a full URL
    let finalId = settings.spreadsheet_id || "";
    const match = finalId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      finalId = match[1];
    }

    const payload = { ...settings, spreadsheet_id: finalId };
    
    try {
      const res = await fetch("/api/admin/google-sheet-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettings(payload);
        alert("Settings saved successfully.");
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    alert("Test connection simulated. Google APIs would be called here.");
  };

  const handleSyncNow = async () => {
    if (!settings.spreadsheet_id || !settings.sheet_name) {
      return alert("Please configure Spreadsheet ID and Sheet Tab Name first.");
    }
    
    // Auto-save before trigger
    let finalId = settings.spreadsheet_id || "";
    const match = finalId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      finalId = match[1];
    }
    const payload = { ...settings, spreadsheet_id: finalId };
    
    try {
      await fetch("/api/admin/google-sheet-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      setSettings(payload);
    } catch (e) {
      // Ignore save error in sync
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/admin/google-sheet-sync/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ import_type: payload.import_type }),
      });
      if (res.ok) {
        alert("Sync triggered successfully. Check logs for details.");
        fetchSettings(payload.import_type);
        fetchLogs();
      } else {
        alert("Sync failed to start.");
      }
    } catch (e) {
      alert("Error triggering sync.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6 max-w-xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-emerald-600" /> Google Sheet Sync Settings
        </h2>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-[#050b18]/45 border border-white/5 rounded-lg">
            <div>
              <div className="font-bold text-white">Enable Sync</div>
              <div className="text-sm text-slate-400">Automatically import new rows from sheet.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.enabled} onChange={e => setSettings({...settings, enabled: e.target.checked})} />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Import Type</label>
            <select
              value={settings.import_type}
              onChange={(e) => setSettings({...settings, import_type: e.target.value})}
              className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Facebook Pages">Facebook Pages</option>
              <option value="Fraud Pages">Fraud Pages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Google Sheet ID</label>
            <input
              type="text"
              value={settings.spreadsheet_id}
              onChange={(e) => setSettings({...settings, spreadsheet_id: e.target.value})}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Sheet Tab Name</label>
            <input
              type="text"
              value={settings.sheet_name}
              onChange={(e) => setSettings({...settings, sheet_name: e.target.value})}
              placeholder="e.g. Sheet1"
              className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Sync Interval</label>
            <select
              value={settings.sync_interval}
              onChange={(e) => setSettings({...settings, sync_interval: e.target.value})}
              className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Manual only">Manual only</option>
              <option value="Every 5 minutes">Every 5 minutes</option>
              <option value="Every 10 minutes">Every 10 minutes</option>
              <option value="Every 15 minutes">Every 15 minutes</option>
              <option value="Every 30 minutes">Every 30 minutes</option>
              <option value="Every 1 hour">Every 1 hour</option>
            </select>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold py-2 px-6 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4 text-emerald-500" /> {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                className="bg-white/5 border border-white/5 text-slate-300 font-bold py-2 px-4 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                Test Connection
              </button>
            </div>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing || !settings.spreadsheet_id}
              className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Sync Now
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6 overflow-hidden">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" /> Sync Logs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-350">
            <thead className="bg-[#050b18]/45 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-4 py-3 border-b border-white/5 w-16">SL</th>
                <th className="px-4 py-3 border-b border-white/5">Started</th>
                <th className="px-4 py-3 border-b border-white/5">Type</th>
                <th className="px-4 py-3 border-b border-white/5">Status</th>
                <th className="px-4 py-3 border-b border-white/5">Total Checked</th>
                <th className="px-4 py-3 border-b border-white/5">Added</th>
                <th className="px-4 py-3 border-b border-white/5">Skipped</th>
                <th className="px-4 py-3 border-b border-white/5">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No sync logs found.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="px-4 py-3 text-slate-300">{new Date(log.started_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-white">{log.import_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${log.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : log.status === 'Failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{log.total_rows_checked}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{log.new_rows_added}</td>
                      <td className="px-4 py-3 text-slate-400">{log.existing_rows_skipped}</td>
                      <td className="px-4 py-3 text-rose-400">{log.failed_rows}</td>
                    </tr>
                    {(log.status === 'Failed' || log.status === 'Completed With Errors') && log.error_report && log.error_report !== '[]' && (
                      <tr className="bg-rose-500/5">
                        <td colSpan={7} className="px-4 py-3 text-xs text-rose-400">
                          <div className="font-bold mb-1">Error Details:</div>
                          <div className="max-h-32 overflow-y-auto">
                            {(() => {
                              try {
                                const parsed = JSON.parse(log.error_report);
                                if (Array.isArray(parsed)) {
                                  return (
                                    <ul className="list-disc pl-4 space-y-1">
                                      {parsed.map((e, idx) => {
                                        let friendlyMsg = e.error || "";
                                        if (friendlyMsg.includes('NOT NULL constraint failed: FacebookPages.')) {
                                          const field = friendlyMsg.split('.').pop() || 'field';
                                          friendlyMsg = `The column "${field}" cannot be empty. Please provide a value or ensure it's not strictly required.`;
                                        } else if (friendlyMsg.includes('UNIQUE constraint failed')) {
                                          friendlyMsg = "A record with this exact information already exists in the system (Duplicate).";
                                        }
                                        return (
                                          <li key={idx}>
                                            {e.rowIndex && e.rowIndex > 0 ? <span className="font-semibold text-rose-700">Row {e.rowIndex}: </span> : null}
                                            {friendlyMsg}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  );
                                }
                                return <div className="font-mono whitespace-pre-wrap break-all">{log.error_report}</div>;
                              } catch (e) {
                                return <div className="font-mono whitespace-pre-wrap break-all">{log.error_report}</div>;
                              }
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
