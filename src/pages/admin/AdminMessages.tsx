import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Search, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ContactMessage; direction: 'asc' | 'desc' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/admin/contact-messages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSort = (key: keyof ContactMessage) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedMessages = useMemo(() => {
    let result = [...messages];

    if (searchQuery) {
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [messages, searchQuery, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMessages = filteredAndSortedMessages.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages(messages.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Contact Messages
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Manage inquiries and messages from the contact form.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm dark:shadow-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#050b18]/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs border-b border-slate-200 dark:border-white/5">
              <tr>
                <th className="px-6 py-4 w-16">SL</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 max-w-[200px]" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Sender <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort('subject')}>
                  <div className="flex items-center gap-1">Subject <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort('is_read')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 text-right font-black">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-slate-200 dark:bg-white/5 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : paginatedMessages.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    No messages found.
                  </td>
                </tr>
              ) : (
                paginatedMessages.map((msg, index) => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${!msg.is_read ? 'bg-slate-50 dark:bg-white/[0.03]' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-start items-center">
                        <div className="min-w-0">
                          <p className={`font-bold truncate w-32 sm:w-48 block ${!msg.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {msg.name}
                          </p>
                          <a href={`mailto:${msg.email}`} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline truncate w-32 sm:w-48 mt-0.5 block" title={msg.email}>
                            {msg.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <span className={`truncate w-32 md:w-64 ${!msg.is_read ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`} title={msg.subject}>
                            {msg.subject || 'No Subject'}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider
                          ${msg.is_read ? "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20" : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"}
                        `}
                      >
                        {msg.is_read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {format(new Date(msg.created_at), 'MMM d, yy')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        to={`/tufayel/messages/${msg.id}`}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline px-2 py-1 mr-2"
                      >
                         View Details
                      </Link>
                      {deleteConfirmId === msg.id ? (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded"
                        >
                           Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(msg.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline px-2 py-1"
                        >
                           Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between bg-slate-50 dark:bg-[#050b18]/40 gap-4">
           <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Showing {filteredAndSortedMessages.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedMessages.length)} of {filteredAndSortedMessages.length} entries
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Show:</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-slate-200"
                >
                   <option value={10}>10</option>
                   <option value={20}>20</option>
                   <option value={50}>50</option>
                   <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded border border-slate-200 dark:border-white/5 bg-white dark:bg-[#091124] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">{currentPage} / {Math.max(1, totalPages)}</span>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded border border-slate-200 dark:border-white/5 bg-white dark:bg-[#091124] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
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
