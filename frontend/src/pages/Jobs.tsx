import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { Job } from '../api/client';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'delivered', 'completed', 'disputed'];

// Map filter key → matching statuses (handles both old lowercase and new UPPERCASE)
const STATUS_FILTER_MAP: Record<string, string[]> = {
  all:         [],
  open:        ['open', 'CREATED', 'FUNDED'],
  in_progress: ['in_progress', 'IN_PROGRESS'],
  delivered:   ['delivered', 'SUBMITTED', 'APPROVED'],
  completed:   ['completed', 'COMPLETED'],
  disputed:    ['disputed', 'DISPUTED'],
};

export default function Jobs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter'); // 'available' | 'mine' | null
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      const r = await api.get('/jobs');
      setJobs(r.data);
    } catch { toast.error('İşler yüklenemedi'); }
    finally { setLoading(false); }
  };

  let filtered = jobs;

  // Apply filterParam BEFORE status/search filters
  if (filterParam === 'available') {
    filtered = filtered.filter(j => ['CREATED', 'FUNDED', 'open'].includes(j.status) && !j.freelancer_id);
  } else if (filterParam === 'mine') {
    filtered = filtered.filter(j => j.client_id === user?.id || j.freelancer_id === user?.id);
  }

  filtered = filtered.filter(j => {
    const allowedStatuses = STATUS_FILTER_MAP[statusFilter] ?? [];
    const matchStatus = statusFilter === 'all' || allowedStatuses.includes(j.status);
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pageHeading = filterParam === 'available'
    ? 'Teklifler'
    : filterParam === 'mine'
    ? 'İşlerim'
    : user?.role === 'freelancer' ? 'Mevcut İşler' : 'İşlerim';

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">
            {pageHeading}
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 fill-current"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-card border border-bg-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-primary transition-colors"
              placeholder="İş ara..." />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  statusFilter === s ? 'bg-brand-primary border-brand-primary text-white' : 'bg-bg-card border-bg-border text-gray-400 hover:text-white'
                }`}>
                {s === 'all' ? 'Tümü' : t(`job.status_labels.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mb-4">{filtered.length} iş bulundu</div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(j => <JobCard key={j.id} job={j} />)}
          </div>
        ) : (
          <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-400">Sonuç bulunamadı</div>
          </div>
        )}
      </div>
    </div>
  );
}
