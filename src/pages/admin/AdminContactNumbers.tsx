import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, Phone, AlertTriangle, Plus, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumberForm, setNewNumberForm] = useState({
    number: "",
    type: "bKash",
    account_type: "Personal",
    display_name: "",
  });
  const navigate = useNavigate();

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
      account_type: accountTypeFilter,
      status: statusFilter,
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
  }, [currentPage, itemsPerPage, debouncedSearch, typeFilter, accountTypeFilter, statusFilter, sortConfig, refreshTrigger]);

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
  const uniqueTypes = ["bKash", "Nagad", "Rocket", "Phone", "WhatsApp"];

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/contact-numbers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newNumberForm),
      });
      if (res.ok) {
        const data = await res.json();
        setShowAddModal(false);
        navigate(`/tufayel/contact-numbers/${data.id}`);
      } else {
        alert("Failed to add number. The number might already exist.");
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
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
             <select
                 value={typeFilter}
                 onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Types</option>
                 {uniqueTypes.map(t => <option key={t as string} value={t as string} className="bg-[#091124]">{t as string}</option>)}
              </select>

              <select
                 value={accountTypeFilter}
                 onChange={(e) => { setAccountTypeFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Account Types</option>
                 <option value="Personal" className="bg-[#091124]">Personal</option>
                 <option value="Agent" className="bg-[#091124]">Agent</option>
                 <option value="Merchant" className="bg-[#091124]">Merchant</option>
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
          </div>
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search numbers..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Add Number
          </button>
        </div>

      </div>

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
                  Display Name
                </label>
                <input
                  type="text"
                  value={newNumberForm.display_name}
                  onChange={(e) =>
                    setNewNumberForm({
                      ...newNumberForm,
                      display_name: e.target.value,
                    })
                  }
                  className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  placeholder="e.g. Test Store"
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
                    <option value="bKash" className="bg-[#091124]">bKash</option>
                    <option value="Nagad" className="bg-[#091124]">Nagad</option>
                    <option value="Rocket" className="bg-[#091124]">Rocket</option>
                    <option value="Phone" className="bg-[#091124]">Phone</option>
                    <option value="WhatsApp" className="bg-[#091124]">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={newNumberForm.account_type}
                    onChange={(e) =>
                      setNewNumberForm({
                        ...newNumberForm,
                        account_type: e.target.value,
                      })
                    }
                    className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg p-2.5 text-sm font-medium focus:outline-none"
                  >
                    <option value="Personal" className="bg-[#091124]">Personal</option>
                    <option value="Agent" className="bg-[#091124]">Agent</option>
                    <option value="Merchant" className="bg-[#091124]">Merchant</option>
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

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">SL</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('number')}>
                  <div className="flex items-center gap-1">Number <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">Type <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('status_badge')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 text-center">
                  Fraud Reports
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-white/5 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : paginatedNumbers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">
                          {number.number}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {number.display_name || "No Name"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {number.type || "Unknown"} -{" "}
                        {number.account_type || "Unknown"}
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

      </div>
    </div>
  );
}
