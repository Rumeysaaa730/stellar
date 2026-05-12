#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const ADMIN: Symbol = symbol_short!("ADMIN");
const PLATFORM: Symbol = symbol_short!("PLATFORM");
const COMM_BPS: Symbol = symbol_short!("COMM_BPS"); // basis points (100 = 1 %)

// ── Data types ────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub enum EscrowStatus {
    Created,
    Funded,
    InProgress,
    Submitted,
    Completed,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct Job {
    pub client:     Address,
    pub freelancer: Address,
    pub amount:     i128,   // XLM in stroops (1 XLM = 10_000_000)
    pub status:     EscrowStatus,
}

#[contracttype]
pub enum DataKey {
    Job(u64),
    NextId,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct FreelanceEscrow;

#[contractimpl]
impl FreelanceEscrow {
    /// Set the admin and platform wallet. Must be called once right after deploy.
    pub fn initialize(env: Env, admin: Address, platform: Address, commission_bps: u32) {
        assert!(!env.storage().instance().has(&ADMIN), "already initialized");
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&PLATFORM, &platform);
        env.storage().instance().set(&COMM_BPS, &commission_bps);
        env.storage().instance().set(&DataKey::NextId, &0_u64);
    }

    /// Client registers a new escrow job. Returns the job id.
    pub fn create_job(env: Env, client: Address, freelancer: Address, amount: i128) -> u64 {
        client.require_auth();
        assert!(amount > 0, "amount must be positive");

        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        let job = Job {
            client: client.clone(),
            freelancer: freelancer.clone(),
            amount,
            status: EscrowStatus::Created,
        };
        env.storage().persistent().set(&DataKey::Job(id), &job);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        env.events().publish(
            (symbol_short!("job_creat"), client),
            (id, freelancer, amount),
        );
        id
    }

    /// Called by the client after they send XLM to the escrow account.
    pub fn fund_job(env: Env, job_id: u64) {
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        job.client.require_auth();
        assert!(job.status == EscrowStatus::Created, "wrong status");
        job.status = EscrowStatus::Funded;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("funded"), job.client), job_id);
    }

    /// Client accepts freelancer → in-progress.
    pub fn start_job(env: Env, job_id: u64) {
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        job.client.require_auth();
        assert!(job.status == EscrowStatus::Funded, "must be funded first");
        job.status = EscrowStatus::InProgress;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
    }

    /// Freelancer submits completed work.
    pub fn submit_work(env: Env, job_id: u64) {
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        job.freelancer.require_auth();
        assert!(job.status == EscrowStatus::InProgress, "wrong status");
        job.status = EscrowStatus::Submitted;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("submitted"), job.freelancer), job_id);
    }

    /// Client approves work. Returns (freelancer_payout, commission) in stroops.
    pub fn approve_work(env: Env, job_id: u64) -> (i128, i128) {
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        job.client.require_auth();
        assert!(job.status == EscrowStatus::Submitted, "wrong status");

        let bps: u32 = env.storage().instance().get(&COMM_BPS).unwrap_or(100);
        let commission = job.amount * bps as i128 / 10_000;
        let payout = job.amount - commission;

        job.status = EscrowStatus::Completed;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish(
            (symbol_short!("approved"), job.client),
            (job_id, payout, commission),
        );
        (payout, commission)
    }

    /// Client or freelancer opens a dispute.
    pub fn open_dispute(env: Env, job_id: u64, opener: Address) {
        opener.require_auth();
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        assert!(opener == job.client || opener == job.freelancer, "not a party");
        assert!(
            matches!(job.status, EscrowStatus::Funded | EscrowStatus::InProgress | EscrowStatus::Submitted),
            "cannot dispute at this stage"
        );
        job.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("disputed"), opener), job_id);
    }

    /// Admin resolves dispute. pay_freelancer_pct 0-100, rest → client.
    /// Returns (freelancer_amount, client_amount) in stroops.
    pub fn resolve_dispute(env: Env, job_id: u64, pay_freelancer_pct: u32) -> (i128, i128) {
        assert!(pay_freelancer_pct <= 100, "pct out of range");
        let admin: Address = env.storage().instance().get(&ADMIN).expect("not init");
        admin.require_auth();

        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        assert!(job.status == EscrowStatus::Disputed, "not disputed");

        let freelancer_amount = job.amount * pay_freelancer_pct as i128 / 100;
        let client_amount = job.amount - freelancer_amount;

        job.status = if pay_freelancer_pct > 0 { EscrowStatus::Completed } else { EscrowStatus::Cancelled };
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish(
            (symbol_short!("resolved"), admin),
            (job_id, freelancer_amount, client_amount),
        );
        (freelancer_amount, client_amount)
    }

    /// Admin force-refunds the client.
    pub fn refund(env: Env, job_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("not init");
        admin.require_auth();
        let mut job: Job = env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found");
        job.status = EscrowStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("refunded"), job.client), job_id);
    }

    // ── Read-only views ────────────────────────────────────────────────────────

    pub fn get_job(env: Env, job_id: u64) -> Job {
        env.storage().persistent().get(&DataKey::Job(job_id)).expect("job not found")
    }

    pub fn get_next_id(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).expect("not init")
    }

    pub fn get_platform(env: Env) -> Address {
        env.storage().instance().get(&PLATFORM).expect("not init")
    }
}

mod test;
