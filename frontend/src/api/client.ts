import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (err.response?.status === 403) {
      toast.error('🚫 Bu işlemi yapmaya yetkiniz yok!', { id: 'unauthorized', duration: 4000 });
    }
    return Promise.reject(err);
  }
);

export default api;

export type User = {
  id: string; name: string; role: 'client' | 'freelancer' | 'admin';
  wallet_address: string; reputation: number; completed_jobs: number;
  balance_xlm: number; total_earned: number; total_spent: number; created_at: string;
};

export type ApplicantDetail = {
  id: string; name: string; reputation: number; completed_jobs: number;
};

export type Job = {
  id: string; title: string; description: string; budget_xlm: number;
  client_id: string; freelancer_id?: string; status: string; category: string;
  deadline?: string; escrow_account?: string; escrow_funded: boolean;
  commission_xlm?: number; delivery_note?: string; delivered_at?: string;
  completed_at?: string; created_at: string;
  applicants?: string[]; applicant_details?: ApplicantDetail[]; applicant_count?: number;
  has_applied?: boolean;
  intended_freelancer_wallet?: string;
  attachment?: { name: string; size: number; type: string };
  client_name?: string; client_wallet?: string;
  freelancer_name?: string; freelancer_wallet?: string; freelancer_reputation?: number;
  dispute_id?: string; dispute_status?: string; dispute_reason?: string;
  dispute_desc?: string; dispute_resolution?: string; dispute_opened_at?: string;
};

export type Dispute = {
  id: string; job_id: string; opened_by: string; reason: string; description: string;
  freelancer_response?: string; resolution?: string; partial_percent?: number;
  resolved_by?: string; status: string; opened_at: string; resolved_at?: string;
  job_title?: string; budget_xlm?: number; client_id?: string; freelancer_id?: string;
  client_name?: string; freelancer_name?: string; opened_by_name?: string;
  job_description?: string; delivery_note?: string;
  client_email?: string; freelancer_email?: string; opened_by_role?: string;
  client_wallet?: string; freelancer_wallet?: string;
  evidence?: { name: string; size: number; type: string };
};

export type Transaction = {
  id: string; job_id?: string; from_address?: string; to_address?: string;
  amount_xlm: number; type: string; stellar_tx_hash?: string; status: string; created_at: string;
  job_title?: string;
};

export type Notification = {
  id: string; user_id: string; type: string; message: string;
  read: boolean; created_at: string; link?: string;
};
