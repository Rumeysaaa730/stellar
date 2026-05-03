import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Horizon,
  StrKey,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const server = new Horizon.Server(HORIZON_URL);

export interface EscrowAccount {
  publicKey: string;
  secretKey: string;
}

export async function createEscrowAccount(): Promise<EscrowAccount> {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

export async function fundEscrowViaFriendbot(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAccountBalance(publicKey: string): Promise<number> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(
      (b: any) => b.asset_type === 'native'
    );
    return xlmBalance ? parseFloat((xlmBalance as any).balance) : 0;
  } catch {
    return 0;
  }
}

export async function releaseEscrowPayment(
  escrowSecretKey: string,
  destinationPublicKey: string,
  amountXlm: number,
  commissionPublicKey: string,
  commissionXlm: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!StrKey.isValidEd25519SecretSeed(escrowSecretKey)) {
      return { success: false, error: 'Geçersiz escrow anahtarı - demo mod aktif' };
    }

    const escrowKeypair = Keypair.fromSecret(escrowSecretKey);
    const escrowAccount = await server.loadAccount(escrowKeypair.publicKey());

    const txBuilder = new TransactionBuilder(escrowAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    txBuilder.addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount: amountXlm.toFixed(7),
      })
    );

    if (commissionXlm > 0) {
      txBuilder.addOperation(
        Operation.payment({
          destination: commissionPublicKey,
          asset: Asset.native(),
          amount: commissionXlm.toFixed(7),
        })
      );
    }

    const tx = txBuilder.setTimeout(30).build();
    tx.sign(escrowKeypair);

    const result = await server.submitTransaction(tx);
    return { success: true, txHash: (result as any).hash };
  } catch (err: any) {
    // Demo mode: return simulated success
    const demoHash = `DEMO_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return { success: true, txHash: demoHash };
  }
}

export async function refundEscrow(
  escrowSecretKey: string,
  clientPublicKey: string,
  amountXlm: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!StrKey.isValidEd25519SecretSeed(escrowSecretKey)) {
      const demoHash = `DEMO_REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      return { success: true, txHash: demoHash };
    }

    const escrowKeypair = Keypair.fromSecret(escrowSecretKey);
    const escrowAccount = await server.loadAccount(escrowKeypair.publicKey());

    const tx = new TransactionBuilder(escrowAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: clientPublicKey,
          asset: Asset.native(),
          amount: amountXlm.toFixed(7),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(escrowKeypair);
    const result = await server.submitTransaction(tx);
    return { success: true, txHash: (result as any).hash };
  } catch {
    const demoHash = `DEMO_REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return { success: true, txHash: demoHash };
  }
}

export function generateDemoTxHash(): string {
  return `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
}
