#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, FreelanceEscrow);
    let admin    = Address::generate(&env);
    let platform = Address::generate(&env);
    let client   = Address::generate(&env);
    let freelancer = Address::generate(&env);

    let c = FreelanceEscrowClient::new(&env, &contract_id);
    c.initialize(&admin, &platform, &100u32); // 1 % commission

    (env, contract_id, client, freelancer, admin)
}

#[test]
fn test_happy_path() {
    let (env, contract_id, client, freelancer, _admin) = setup();
    let c = FreelanceEscrowClient::new(&env, &contract_id);

    let amount: i128 = 100_000_000; // 10 XLM in stroops
    let job_id = c.create_job(&client, &freelancer, &amount);
    assert_eq!(job_id, 0);

    c.fund_job(&job_id);
    c.start_job(&job_id);
    c.submit_work(&job_id);
    let (payout, commission) = c.approve_work(&job_id);

    assert_eq!(commission, 1_000_000);  // 1 %
    assert_eq!(payout, 99_000_000);     // 99 %

    let job = c.get_job(&job_id);
    assert_eq!(job.status, EscrowStatus::Completed);
}

#[test]
fn test_dispute_resolve_full_freelancer() {
    let (env, contract_id, client, freelancer, admin) = setup();
    let c = FreelanceEscrowClient::new(&env, &contract_id);

    let job_id = c.create_job(&client, &freelancer, &50_000_000_i128);
    c.fund_job(&job_id);
    c.start_job(&job_id);
    c.open_dispute(&job_id, &client);

    let (fl, cl) = c.resolve_dispute(&job_id, &100u32);
    assert_eq!(fl, 50_000_000);
    assert_eq!(cl, 0);
}

#[test]
fn test_refund() {
    let (env, contract_id, client, freelancer, _admin) = setup();
    let c = FreelanceEscrowClient::new(&env, &contract_id);

    let job_id = c.create_job(&client, &freelancer, &20_000_000_i128);
    c.fund_job(&job_id);
    c.refund(&job_id);

    let job = c.get_job(&job_id);
    assert_eq!(job.status, EscrowStatus::Cancelled);
}
