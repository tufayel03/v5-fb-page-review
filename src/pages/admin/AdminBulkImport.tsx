import React, { useState, useEffect } from "react";
import { Upload, Download, FileText, CheckCircle, XCircle, ShieldAlert, RefreshCw, Archive } from "lucide-react";
import AdminGoogleSheetSync from "./AdminGoogleSheetSync";

export default function AdminBulkImport() {
  const [activeTab, setActiveTab] = useState("import");
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [importType, setImportType] = useState("Facebook Pages");
  const [file, setFile] = useState<File | null>(null);
  
  // Progress states
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Backup / Restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleDownloadBackup = () => {
    setBackupLoading(true);
    const token = localStorage.getItem('token');
    const url = `/api/admin/backup-db?token=${token}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `website_full_backup_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    setTimeout(() => {
      setBackupLoading(false);
    }, 2000);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return alert("Please select a valid website_full_backup.zip file");

    if (!confirm("⚠️ WARNING: This will completely overwrite your database and all uploaded media files! Are you absolutely sure you want to proceed?")) {
      return;
    }

    const formData = new FormData();
    formData.append('dbfile', restoreFile);

    setRestoreProgress(0);
    setRestoreMessage(null);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/restore-db');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setRestoreProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setRestoreProgress(100);
          const resData = JSON.parse(xhr.responseText);
          setRestoreMessage({ type: 'success', text: resData.message || "Website restored successfully! Server is restarting..." });
          setTimeout(() => {
            localStorage.clear();
            window.location.href = '/login';
          }, 4000);
        } else {
          let errMsg = "Restore failed";
          try {
            const resData = JSON.parse(xhr.responseText);
            errMsg = resData.error || errMsg;
          } catch(e) {}
          setRestoreMessage({ type: 'error', text: errMsg });
          setRestoreProgress(null);
        }
      };

      xhr.onerror = () => {
        setRestoreMessage({ type: 'error', text: "Network error during restore." });
        setRestoreProgress(null);
      };

      xhr.send(formData);
    } catch(err) {
      setRestoreMessage({ type: 'error', text: "An unexpected error occurred." });
      setRestoreProgress(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const fetchHistory = () => {
    fetch("/api/admin/bulk-imports", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setImports(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    let interval: any;
    if (jobId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/bulk-imports/${jobId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          const data = await res.json();
          if (data && data.total_rows > 0) {
            const processed = data.successful_rows + data.failed_rows; // skipped rows are not added to total loops? actually total_rows might be the full length
            // We can just fake up to 99% or calculate
            const pct = Math.min(99, Math.round((processed / data.total_rows) * 100));
            setImportProgress(pct);
            
            if (data.status === 'Completed' || data.status === 'Completed With Errors' || data.status === 'Failed') {
              clearInterval(interval);
              setImportProgress(100);
              setTimeout(() => {
                setImportProgress(null);
                setJobId(null);
                alert(`Import ${data.status}! Added: ${data.successful_rows}, Failed: ${data.failed_rows}`);
                setFile(null);
                fetchHistory();
              }, 500);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobId]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', importType);

    setImportProgress(0);

    try {
      const res = await fetch('/api/admin/pages/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        setJobId(data.jobId);
        setImportProgress(5);
      } else {
        alert("Import failed to start: " + (data.error || "Unknown error"));
        setImportProgress(null);
      }
    } catch (err) {
      alert("Network error");
      setImportProgress(null);
    }
  };

  const handleExportFacebookPages = () => {
    setExportProgress(0);
    const token = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/admin/pages/export?token=' + token);
    xhr.responseType = 'blob';

    let fakeProgressInterval = setInterval(() => {
      setExportProgress((p) => {
        if (p === null) return 0;
        const next = p + Math.floor(Math.random() * 15) + 5;
        return next > 95 ? 95 : next;
      });
    }, 150);

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        clearInterval(fakeProgressInterval);
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setExportProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      clearInterval(fakeProgressInterval);
      setExportProgress(100);
      setTimeout(() => {
        setExportProgress(null);
        if (xhr.status === 200) {
          const blob = xhr.response;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'facebook-pages-export.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          alert("Failed to export Facebook pages");
        }
      }, 500);
    };

    xhr.onerror = () => {
      clearInterval(fakeProgressInterval);
      setExportProgress(null);
      alert("Export failed: Network error");
    };

    xhr.send();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Bulk Import & Export
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage bulk data operations via Excel files or Google Sheets.
        </p>
      </div>

      <div className="flex space-x-1 bg-[#050b18]/45 p-1 rounded-lg w-full sm:max-w-3xl overflow-x-auto border border-white/5">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === "import" ? "bg-white/5 text-white shadow-md border border-white/5" : "text-slate-400 hover:text-white"}`}
        >
          Import Data
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === "export" ? "bg-white/5 text-white shadow-md border border-white/5" : "text-slate-400 hover:text-white"}`}
        >
          Export Data
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === "history" ? "bg-white/5 text-white shadow-md border border-white/5" : "text-slate-400 hover:text-white"}`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab("google-sheet")}
          className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === "google-sheet" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
        >
          Google Sheet Sync
        </button>
        <button
          onClick={() => setActiveTab("backup-restore")}
          className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === "backup-restore" ? "bg-amber-600 text-white shadow border border-amber-500/20" : "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"}`}
        >
          Full Backup & Restore
        </button>
      </div>

      {activeTab === "google-sheet" && <AdminGoogleSheetSync />}

      {activeTab === "import" && (
        <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">
            Upload Excel File (.xlsx)
          </h2>

          <form onSubmit={handleImport} className="space-y-6 max-w-xl">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Import Type
              </label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
                className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={importProgress !== null}
              >
                <option value="Facebook Pages">Facebook Pages</option>
                <option value="Fraud Pages">Fraud Pages</option>
                <option value="Contact Numbers">Contact Numbers</option>
              </select>
            </div>

            <div className={`border-2 ${importProgress !== null ? 'border-blue-500/30 bg-blue-900/10' : 'border-dashed border-white/10'} rounded-xl p-8 text-center hover:bg-white/[0.01] transition-colors relative overflow-hidden`}>
              {importProgress !== null ? (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="w-full bg-white/10 rounded-full h-4 mb-4">
                    <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                  <div className="text-xl font-bold text-blue-400 mb-2">{importProgress}%</div>
                  <div className="text-sm text-slate-400 font-medium">Processing File... Please wait.</div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                  <div className="text-sm font-bold text-slate-200 mb-1">
                    Click to upload or drag and drop
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    XLSX up to 10MB
                  </p>
                  <input
                    type="file"
                    key={file ? file.name : 'empty'}
                    accept=".xlsx"
                    onChange={(e) =>
                      setFile(e.target.files ? e.target.files[0] : null)
                    }
                    className="text-sm text-slate-400 mx-auto block w-full max-w-[250px]"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={importProgress !== null || !file}
                className={`text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all ${importProgress !== null || !file ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10'}`}
              >
                {importProgress !== null ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Importing...
                  </span>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload & Parse</>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (importType === 'Contact Numbers') {
                    window.open(`/api/admin/contact-numbers/export?template=true&token=${token}`, '_blank');
                  } else {
                    window.open(`/api/admin/pages/export?template=true&token=${token}`, '_blank');
                  }
                }}
                disabled={importProgress !== null}
                className={`text-sm font-bold flex items-center gap-1 transition-colors ${importProgress !== null ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText className="h-4 w-4" /> Download Sample Template
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "export" && (
        <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">
            Export Database
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Facebook Pages",
              "Fraud Pages"
            ].map((item) => (
              <div
                key={item}
                className="border border-white/5 bg-[#050b18]/45 rounded-lg p-4 hover:border-white/10 transition-colors flex flex-col items-center text-center relative overflow-hidden"
              >
                {item === "Facebook Pages" && exportProgress !== null && (
                  <div className="absolute inset-0 bg-[#091124]/90 z-10 flex flex-col items-center justify-center p-2">
                    <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <div className="text-sm font-bold text-emerald-400">{exportProgress}%</div>
                  </div>
                )}
                <h3 className="font-bold text-slate-200 mb-4">{item}</h3>
                <button 
                  disabled={exportProgress !== null}
                  onClick={() => {
                    handleExportFacebookPages(); // Adjust url for fraud pages if needed in future, but template is same
                  }}
                  className="bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white py-2 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center gap-2 w-full justify-center disabled:opacity-50 transition-all animate-none"
                >
                  <Download className="h-4 w-4" /> Export .XLSX
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#050b18]/45 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5">Date</th>
                <th className="px-6 py-4 border-b border-white/5">Type</th>
                <th className="px-6 py-4 border-b border-white/5">
                  File Name
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-center">
                  Status
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center animate-pulse text-slate-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : imports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    No import history found.
                  </td>
                </tr>
              ) : (
                imports.map((imp) => (
                  <React.Fragment key={imp.id}>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4">
                        {new Date(imp.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {imp.import_type}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {imp.file_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {imp.status === 'Completed' || imp.status === 'Completed With Errors' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-2 py-1 rounded text-[10px] font-black uppercase">
                            <CheckCircle className="h-3 w-3" /> {imp.status}
                          </span>
                        ) : imp.status === 'Failed' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/15 text-rose-400 px-2 py-1 rounded text-[10px] font-black uppercase">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/15 text-blue-400 px-2 py-1 rounded text-[10px] font-black uppercase">
                             Processing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <span className="text-emerald-400 font-bold">
                          {imp.successful_rows || 0} added
                        </span>
                        {(imp.failed_rows || 0) > 0 && (
                          <span className="text-rose-400 font-bold ml-2">
                            {imp.failed_rows} failed
                          </span>
                        )}
                      </td>
                    </tr>
                    {(imp.status === 'Failed' || imp.status === 'Completed With Errors') && imp.error_report && imp.error_report !== '[]' && (
                      <tr className="bg-rose-500/5">
                        <td colSpan={5} className="px-6 py-3 text-xs text-rose-400">
                          <div className="font-bold mb-1">Error Details:</div>
                          <div className="max-h-32 overflow-y-auto">
                            {(() => {
                              try {
                                const parsed = JSON.parse(imp.error_report);
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
                                            {e.rowIndex && e.rowIndex > 0 ? <span className="font-semibold text-rose-400">Row {e.rowIndex}: </span> : null}
                                            {friendlyMsg}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  );
                                }
                                return <div className="font-mono whitespace-pre-wrap break-all">{imp.error_report}</div>;
                              } catch (e) {
                                return <div className="font-mono whitespace-pre-wrap break-all">{imp.error_report}</div>;
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
      )}
      {activeTab === "backup-restore" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Backup Card */}
          <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Full Server Backup</h2>
                  <p className="text-xs text-slate-400">Download everything in one single package</p>
                </div>
              </div>
              
              <div className="bg-[#050b18]/45 border border-white/5 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">What is included in this backup:</h3>
                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                  <li><strong>Complete Database (`data.db`)</strong>: All pages, reviews, user profiles, claims, disputes, settings, BKash configurations, visitor analytics logs, and audit logs.</li>
                  <li><strong>All Uploaded Media Assets (`/uploads/`)</strong>: All page logos, user-uploaded proof screenshots, fraud evidences, avatars, and customized blog images.</li>
                </ul>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                This is a comprehensive, self-contained archive (.zip). If your VPS gets completely deleted, you can pull this codebase from GitHub onto a fresh server, upload this zip file, and your platform will be immediately operational with all data restored exactly as it was.
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              disabled={backupLoading}
              className={`w-full py-3 rounded-lg font-bold text-sm text-white transition-all flex items-center justify-center gap-2 ${backupLoading ? 'bg-amber-600/30 text-amber-300 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/10'}`}
            >
              {backupLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Full Zip Archive...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Full Zip Backup
                </>
              )}
            </button>
          </div>

          {/* Full Restore Card */}
          <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Full System Restore</h2>
                  <p className="text-xs text-slate-400">Upload & overwrite existing database/media</p>
                </div>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg flex gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-300">CRITICAL WARNING</h4>
                  <p className="text-[11px] text-rose-200 leading-relaxed">
                    Restoring a backup will **completely replace** the current database and deletes any newly uploaded files since the backup was made. This action is **irreversible**.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRestore} className="space-y-4">
                <div className={`border border-dashed border-white/10 rounded-lg p-4 text-center hover:bg-white/[0.01] transition-colors relative overflow-hidden ${restoreProgress !== null ? 'bg-indigo-950/20 border-indigo-500/30' : ''}`}>
                  {restoreProgress !== null ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${restoreProgress}%` }}></div>
                      </div>
                      <div className="text-xs font-bold text-indigo-400">{restoreProgress}% Uploaded</div>
                      <p className="text-[10px] text-slate-400 mt-1">Extracting zip and replacing database...</p>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-400 mx-auto block w-full"
                    />
                  )}
                </div>

                {restoreMessage && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${restoreMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                    {restoreMessage.text}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={restoreProgress !== null || !restoreFile}
                  className={`w-full py-3 rounded-lg font-bold text-sm text-white transition-all flex items-center justify-center gap-2 ${restoreProgress !== null || !restoreFile ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/10'}`}
                >
                  {restoreProgress !== null ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Restoring Platform...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload & Restore Website
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
