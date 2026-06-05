import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, Phone, AlertTriangle, Plus, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function AdminContactNumbers() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Reported');
  const [addedByFilter, setAddedByFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumberForm, setNewNumberForm] = useState({
    number: "",
    type: "Contact Number",
    description: "",
    status: "Reported",
  });
  const navigate = useNavigate();

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (importJobId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/bulk-imports/${importJobId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          const data = await res.json();
          if (data && data.total_rows > 0) {
            const processed = data.successful_rows + data.failed_rows;
            const pct = Math.min(99, Math.round((processed / data.total_rows) * 100));
            setImportProgress(pct);
            
            if (data.status === 'Completed' || data.status === 'Completed With Errors' || data.status === 'Failed') {
              clearInterval(interval);
              setImportProgress(100);
              setTimeout(() => {
                setImportProgress(null);
                setImportJobId(null);
                alert(`Import ${data.status}! Added: ${data.successful_rows}, Failed: ${data.failed_rows}`);
                setShowImportModal(false);
                setImportFile(null);
                fetchNumbers();
              }, 500);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [importJobId]);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return alert("Please select an Excel file first.");

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('import_type', 'Contact Numbers');

    setImportProgress(0);

    try {
      const res = await fetch('/api/admin/pages/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        setImportJobId(data.jobId);
        setImportProgress(5);
      } else {
        alert("Import failed: " + (data.error || "Unknown error"));
        setImportProgress(null);
      }
    } catch (err) {
      alert("Network error occurred during import.");
      setImportProgress(null);
    }
  };

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStatusValue, setBulkStatusValue] = useState("Reported");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);

  const selectAllMatchingContacts = async () => {
    setSelectingAllMatching(true);
    try {
      let sortBy = 'created_at';
      let sortOrder = 'desc';
      if (sortConfig) {
        sortBy = sortConfig.key;
        sortOrder = sortConfig.direction === 'asc' ? 'asc' : 'desc';
      }

      const params = new URLSearchParams({
        search: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        addedBy: addedByFilter,
        sortBy,
        sortOrder,
        allIds: "true"
      });

      const res = await fetch(`/api/admin/contact-numbers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ids)) {
          setSelectedIds(data.ids);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSelectingAllMatching(false);
    }
  };

  const handleExportExcel = () => {
    const queryParams = new URLSearchParams();
    if (selectedIds.length > 0) {
      queryParams.append("ids", selectedIds.join(","));
    } else {
      let sortBy = 'created_at';
      let sortOrder = 'desc';
      if (sortConfig) {
        sortBy = sortConfig.key;
        sortOrder = sortConfig.direction === 'asc' ? 'asc' : 'desc';
      }

      queryParams.append("search", debouncedSearch);
      queryParams.append("type", typeFilter);
      queryParams.append("status", statusFilter);
      queryParams.append("addedBy", addedByFilter);
      queryParams.append("sortBy", sortBy);
      queryParams.append("sortOrder", sortOrder);
    }

    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/contact-numbers/export?${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to export");
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contact-numbers-export-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => {
        alert(err.message || "Export failed");
      });
  };

  const executeBulkAction = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkAction) {
      alert("Please select a valid bulk action.");
      return;
    }

    if (bulkAction === 'export') {
      handleExportExcel();
      setSelectedIds([]);
      setBulkAction("");
      return;
    }

    if (bulkAction === 'delete') {
      const confirmDelete = window.confirm(`⚠️ Permanently delete ${selectedIds.length} selected contact numbers? This cannot be undone!`);
      if (!confirmDelete) return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/contact-numbers/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ids: selectedIds,
          action: bulkAction,
          value: bulkAction === 'change_status' ? bulkStatusValue : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute bulk action');
      }

      alert(data.message || 'Bulk action completed successfully!');
      setSelectedIds([]);
      setBulkAction("");
      fetchNumbers();
    } catch(err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during bulk operations.');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    let sortBy = 'created_at';
    let sortOrder = 'desc';
    if (sortConfig) {
      sortBy = sortConfig.key;
      sortOrder = sortConfig.direction === 'asc' ? 'asc' : 'desc';
    }

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: debouncedSearch,
      type: typeFilter,
      status: statusFilter,
      addedBy: addedByFilter,
      sortBy,
      sortOrder,
    });

    fetch(`/api/admin/contact-numbers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then((json) => {
        const data = json.data || (Array.isArray(json) ? json : []);
        setNumbers(data);
        setTotalCount(json.totalCount !== undefined ? json.totalCount : data.length);
        setTotalPages(json.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPage, itemsPerPage, debouncedSearch, typeFilter, statusFilter, addedByFilter, sortConfig, refreshTrigger]);

  const fetchNumbers = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNumbers = numbers;
  const uniqueTypes = ["Contact Number", "Payment Number"];

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/contact-numbers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: newNumberForm.number,
          type: newNumberForm.type,
          display_name: newNumberForm.description,
          admin_note: newNumberForm.description,
          status: newNumberForm.status,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        if (data.count > 1) {
          fetchNumbers();
          alert(`Successfully added ${data.count} numbers. Skipped ${data.skipped?.length || 0} duplicates.`);
        } else if (data.id) {
          navigate(`/tufayel/contact-numbers/${data.id}`);
        } else {
          fetchNumbers();
        }
      } else {
        alert(data.error || "Failed to add number. The number might already exist.");
      }
    } catch (err) {
      alert("Error adding number");
    }
  };

  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            bKash / Contact Numbers
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            Manage payment and contact numbers.
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                 value={typeFilter}
                 onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Types</option>
                 {uniqueTypes.map(t => <option key={t as string} value={t as string} className="bg-[#091124]">{t as string}</option>)}
              </select>

              <select
                 value={statusFilter}
                 onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Statuses</option>
                 <option value="Reported" className="bg-[#091124]">Reported</option>
                 <option value="Suspicious" className="bg-[#091124]">Suspicious</option>
                 <option value="Verified Merchant" className="bg-[#091124]">Verified Merchant</option>
                 <option value="Safe" className="bg-[#091124]">Safe</option>
              </select>

              <select
                 value={addedByFilter}
                 onChange={(e) => { setAddedByFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Sources</option>
                 <option value="admin" className="bg-[#091124]">Admin Added</option>
                 <option value="users" className="bg-[#091124]">User Added</option>
              </select>
          </div>
          <div className="relative flex-1 w-full lg:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search numbers..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-sky-600/15 hover:bg-sky-600/25 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full lg:w-auto cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Import Excel
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full lg:w-auto cursor-pointer"
            >
              <FileDown className="h-4 w-4" /> Export Excel
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full lg:w-auto"
            >
              <Plus className="h-4 w-4" /> Add Number
            </button>
          </div>
        </div>

      </div>

      {/* Clear filter indicator */}
      {(typeFilter !== "all" || statusFilter !== "Reported" || addedByFilter !== "all" || searchQuery !== "") && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setTypeFilter("all");
              setStatusFilter("Reported");
              setAddedByFilter("all");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            ✕ Reset All Active Filters
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-[#050b18]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#050b18]/40">
              <h3 className="font-bold text-white">Add New Number</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddNumber} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  required
                  type="text"
                  value={newNumberForm.number}
                  onChange={(e) =>
                    setNewNumberForm({
                      ...newNumberForm,
                      number: e.target.value,
                    })
                  }
                  className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  placeholder="e.g. 01700000000"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newNumberForm.description}
                  onChange={(e) =>
                    setNewNumberForm({
                      ...newNumberForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-650"
                  placeholder="e.g. Scammer number, active on various pages..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={newNumberForm.type}
                    onChange={(e) =>
                      setNewNumberForm({
                        ...newNumberForm,
                        type: e.target.value,
                      })
                    }
                    className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm font-medium focus:outline-none"
                  >
                    <option value="Contact Number" className="bg-[#091124]">Contact Number</option>
                     <option value="Payment Number" className="bg-[#091124]">Payment Number</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newNumberForm.status}
                    onChange={(e) =>
                      setNewNumberForm({
                        ...newNumberForm,
                        status: e.target.value,
                      })
                    }
                    className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm font-medium focus:outline-none"
                  >
                    <option value="Reported" className="bg-[#091124]">Reported</option>
                    <option value="Suspicious" className="bg-[#091124]">Suspicious</option>
                    <option value="Verified Merchant" className="bg-[#091124]">Verified Merchant</option>
                    <option value="Safe" className="bg-[#091124]">Safe</option>
                  </select>
                </div>

              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-300 font-bold hover:text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm"
                >
                  Add Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Action Workspace Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-7 px-3 rounded-full bg-emerald-500 text-[#050b18] text-xs font-black flex items-center justify-center select-none shadow">
              {selectedIds.length} Selected
            </div>
            <p className="text-sm text-slate-200 mt-1 lg:mt-0 font-semibold">
              Select an action to apply to the contact numbers chosen above.
            </p>
            {selectedIds.length === numbers.length && totalCount > numbers.length && (
              <button
                disabled={selectingAllMatching}
                onClick={selectAllMatchingContacts}
                className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-400 text-xs font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {selectingAllMatching ? "Loading all..." : `Select all ${totalCount} numbers`}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">-- Bulk Actions --</option>
              <option value="change_status">Bulk Change Status...</option>
              <option value="export">Bulk Export to Excel</option>
              <option value="delete">Bulk Permanently Delete</option>
            </select>

            {bulkAction === "change_status" && (
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Reported">Reported</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Verified Merchant">Verified Merchant</option>
                <option value="Safe">Safe</option>
              </select>
            )}

            <button
              disabled={bulkLoading || !bulkAction}
              onClick={executeBulkAction}
              className="bg-emerald-600 hover:bg-emerald-500 font-extrabold text-[#050b18] px-4 py-2 rounded-lg text-sm transition-all shadow hover:shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkLoading ? "Running..." : "Apply to Chosen"}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 transition-all"
            >
              Clear choices
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs select-none">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={numbers.length > 0 && numbers.every(n => {
                        const rowIds = n.grouped_ids ? n.grouped_ids.split(',') : [n.id];
                        return rowIds.every(id => selectedIds.includes(id));
                      })}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = numbers.flatMap(n => n.grouped_ids ? n.grouped_ids.split(',') : [n.id]);
                          setSelectedIds(allIds);
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-700 bg-[#050b18] text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 shrink-0"
                    />
                    <span>SL</span>
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('number')}>
                  <div className="flex items-center gap-1">Number <ArrowUpDown className="h-3 w-3"/></div>
                </th>

                <th className="px-6 py-4 border-b border-white/5 text-center cursor-pointer hover:bg-white/5" onClick={() => handleSort('linked_page_count')}>
                  <div className="flex items-center justify-center gap-1">Linked Pages <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('status_badge')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 text-center" onClick={() => handleSort('fraud_report_count')}>
                  <div className="flex items-center justify-center gap-1">Fraud Reports <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-white/5 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : paginatedNumbers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    No numbers found.
                  </td>
                </tr>
              ) : (
                paginatedNumbers.map((number, index) => {
                  const isReported =
                    number.status === "Reported" ||
                    number.status === "Suspicious";
                  return (
                    <tr
                      key={number.id}
                      className={`hover:bg-white/[0.02] transition-all ${(() => {
                        const rowIds = number.grouped_ids ? number.grouped_ids.split(',') : [number.id];
                        return rowIds.every(id => selectedIds.includes(id)) ? "bg-emerald-500/[0.04] text-white" : "";
                      })()}`}
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={(() => {
                              const rowIds = number.grouped_ids ? number.grouped_ids.split(',') : [number.id];
                              return rowIds.every(id => selectedIds.includes(id));
                            })()}
                            onChange={(e) => {
                              const rowIds = number.grouped_ids ? number.grouped_ids.split(',') : [number.id];
                              if (e.target.checked) {
                                setSelectedIds(prev => {
                                  const newIds = [...prev];
                                  rowIds.forEach(id => {
                                    if (!newIds.includes(id)) newIds.push(id);
                                  });
                                  return newIds;
                                });
                              } else {
                                setSelectedIds(prev => prev.filter(id => !rowIds.includes(id)));
                              }
                            }}
                            className="rounded border-slate-700 bg-[#050b18] text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 shrink-0"
                          />
                          <span className="font-mono text-xs text-slate-500">{startIndex + index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">
                          {number.number}
                        </p>
                        <div className="text-xs mt-0.5 flex flex-wrap gap-1 text-slate-400">
                          {number.linked_pages_info && number.linked_pages_info.length > 0 ? (
                            number.linked_pages_info.map((p: any, idx: number) => (
                              <React.Fragment key={p.id}>
                                {idx > 0 && <span className="text-slate-600">, </span>}
                                <Link
                                  to={`/tufayel/pages/${p.id}`}
                                  className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                                >
                                  {p.name || "Unknown Page"}
                                </Link>
                              </React.Fragment>
                            ))
                          ) : number.display_name ? (
                            <span>{number.display_name}</span>
                          ) : (
                            <span className="text-slate-500 italic">No Name</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const count = number.linked_pages_info ? number.linked_pages_info.length : 0;
                          return count > 0 ? (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black ${
                              count >= 3
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                : count === 2
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                            }`}>
                              {count} {count === 1 ? 'page' : 'pages'}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">—</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${
                              number.status === "Reported"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : number.status === "Suspicious"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : number.status === "Verified Merchant"
                                    ? "bg-[#10b981]/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-slate-500/10 text-slate-400 border border-[#475569]/30"
                            }
                          `}
                        >
                          {number.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {number.fraud_report_count > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-rose-400 font-bold">
                            <AlertTriangle className="h-3 w-3 animate-pulse" />{" "}
                            {number.fraud_report_count}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tufayel/contact-numbers/${number.id}`}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#050b18]/40 gap-4">
           <div className="text-sm text-slate-400 font-medium font-semibold">
              Showing {totalCount === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalCount)} of {totalCount} entries
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">Show:</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200"
                >
                   <option value={10} className="bg-[#091124]">10</option>
                   <option value={20} className="bg-[#091124]">20</option>
                   <option value={50} className="bg-[#091124]">50</option>
                   <option value={100} className="bg-[#091124]">100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-bold px-2 text-slate-300">{currentPage} / {Math.max(1, totalPages)}</span>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-[#050b18]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#050b18]/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-sky-400" />
                Import Contact Numbers
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportProgress(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleImportSubmit} className="p-5 space-y-4">
              <div className={`border-2 ${importProgress !== null ? 'border-sky-500/30 bg-sky-900/10' : 'border-dashed border-white/10'} rounded-xl p-6 text-center hover:bg-white/[0.01] transition-colors relative overflow-hidden`}>
                {importProgress !== null ? (
                  <div className="flex flex-col items-center justify-center p-2">
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                      <div className="bg-sky-500 h-3 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                    </div>
                    <div className="text-lg font-extrabold text-sky-400 mb-1">{importProgress}%</div>
                    <div className="text-xs text-slate-400 font-semibold">Processing file, please do not close...</div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <div className="text-xs font-bold text-slate-200 mb-1">
                      Drag & drop your Excel file here or click below
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">
                      Supports XLSX sheets only (Max 10MB)
                    </p>
                    <input
                      type="file"
                      required
                      accept=".xlsx"
                      onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-350 mx-auto block max-w-[200px]"
                    />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    window.open('/api/admin/contact-numbers/export?template=true&token=' + localStorage.getItem('token'), '_blank');
                  }}
                  disabled={importProgress !== null}
                  className={`text-xs font-bold flex items-center gap-1 transition-colors ${importProgress !== null ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  <FileDown className="h-4 w-4" /> Download Sample Template
                </button>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                    }}
                    disabled={importProgress !== null}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importProgress !== null || !importFile}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold text-[#050b18] cursor-pointer flex items-center gap-1.5 transition-all ${
                      importProgress !== null || !importFile
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-400 hover:bg-sky-500 shadow-md shadow-sky-500/10'
                    }`}
                  >
                    {importProgress !== null ? 'Importing...' : 'Upload & Import'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
