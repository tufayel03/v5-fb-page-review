import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, Edit, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, Plus } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [roleFilter, setRoleFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [formData, setFormData] = useState({ full_name: "", username: "", email: "", password: "", role: "User" });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

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
      role: roleFilter,
      sortBy,
      sortOrder,
    });

    fetch(`/api/admin/users?${params.toString()}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then((json) => {
        const data = json.data || (Array.isArray(json) ? json : []);
        setUsers(data);
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
  }, [currentPage, itemsPerPage, debouncedSearch, roleFilter, sortConfig, refreshTrigger]);

  const fetchUsers = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) return;
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...users.map(u => [
        u.id,
        '"' + (u.full_name || '').replace(/"/g, '""') + '"',
        '"' + (u.email || '').replace(/"/g, '""') + '"',
        u.role || '',
        u.status || 'Active',
        Array.isArray(u.linked_pages) ? u.linked_pages.length : 0,
        u.created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ full_name: "", username: "", email: "", password: "", role: "User" });
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setIsEditing(true);
    setEditingId(user.id);
    setFormData({ full_name: user.full_name, username: user.username, email: user.email, password: "", role: user.role === 'admin' ? 'Super Admin' : user.role });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      const url = isEditing ? `/api/admin/users/${editingId}` : '/api/admin/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = isEditing ? { role: formData.role, password: formData.password } : formData;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      
      fetchUsers();
      setIsModalOpen(false);
    } catch(err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch(err: any) {
      alert(err.message);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users;
  const uniqueRoles = ["User", "Business Owner", "Moderator", "Admin", "Super Admin"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Users
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            Manage user accounts and roles.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add User
          </button>
          <button onClick={handleExportCSV} className="bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <select
                 value={roleFilter}
                 onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Roles</option>
                 {uniqueRoles.map(r => <option key={r as string} value={r as string} className="bg-[#091124]">{r as string}</option>)}
              </select>
          </div>
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">SL</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('full_name')}>
                  <div className="flex items-center gap-1">User <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1">Email <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">Role <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">Joined <ArrowUpDown className="h-3 w-3"/></div>
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
              ) : paginatedUsers.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => {
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-medium">{startIndex + index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{user.full_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">@{user.username}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${(user.role === "admin" || user.role === "Super Admin" || user.role === "Admin") ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : (user.role === "Moderator" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-500/10 text-slate-400 border border-[#475569]/30")}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(user)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 ml-2">
                          Delete
                        </button>
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
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-[#091124] border border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200">
                   <option value={10} className="bg-[#091124]">10</option>
                   <option value={20} className="bg-[#091124]">20</option>
                   <option value={50} className="bg-[#091124]">50</option>
                   <option value={100} className="bg-[#091124]">100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-bold px-2 text-slate-300">{currentPage} / {Math.max(1, totalPages)}</span>
                 <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b18]/60 backdrop-blur-sm animate-fade-in animate-duration-150">
          <div className="bg-[#091124] border border-white/5 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#050b18]/40">
              <h2 className="text-lg font-black text-white">{isEditing ? 'Edit User' : 'Add New User'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {modalError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg font-medium">
                  {modalError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    disabled={isEditing}
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className={`w-full border border-white/5 text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium ${isEditing ? 'bg-[#050b18]/60 text-slate-400 cursor-not-allowed' : 'bg-[#050b18]'}`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    disabled={isEditing}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className={`w-full border border-white/5 text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium ${isEditing ? 'bg-[#050b18]/60 text-slate-400 cursor-not-allowed' : 'bg-[#050b18]'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">
                    {isEditing ? (
                      <>New Password <span className="text-slate-500 font-semibold text-xs">(leave blank to keep current)</span></>
                    ) : (
                      'Password'
                    )}
                  </label>
                  <input 
                    type="password" 
                    required={!isEditing}
                    placeholder={isEditing ? "••••••••" : ""}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  >
                    <option value="User" className="bg-[#091124]">User</option>
                    <option value="Business Owner" className="bg-[#091124]">Business Owner</option>
                    <option value="Moderator" className="bg-[#091124]">Moderator</option>
                    <option value="Admin" className="bg-[#091124]">Admin</option>
                    <option value="Super Admin" className="bg-[#091124]">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 px-6 py-2 rounded-lg text-sm font-black transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
