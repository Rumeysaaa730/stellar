import toast from 'react-hot-toast';

const yellowStyle = {
  background: '#78350f',
  color: '#fef3c7',
  border: '1px solid #d97706',
};

export function alertWalletNotConnected() {
  toast('⚠️ Lütfen önce cüzdanınızı bağlayın!', {
    id: 'wallet-not-connected',
    duration: 4000,
    style: yellowStyle,
  });
}

export function alertInsufficientBalance() {
  toast.error('❌ Bakiyeniz yetersiz! Test XLM alın', {
    id: 'insufficient-balance',
    duration: 5000,
  });
}

export function alertEscrowSuccess(title?: string) {
  toast.success(
    title ? `✅ "${title}" escrow'u oluşturuldu!` : '✅ Escrow başarıyla oluşturuldu!',
    { id: 'escrow-success', duration: 4000 },
  );
}

export function alertTransactionFailed(reason?: string) {
  toast.error(reason ? `❌ İşlem başarısız: ${reason}` : '❌ İşlem başarısız', {
    duration: 5000,
  });
}

export function alertSessionExpired() {
  toast.error('🔄 Oturum süreniz doldu, tekrar bağlanın!', {
    id: 'session-expired',
    duration: 6000,
  });
}

export function alertUnauthorized() {
  toast.error('🚫 Bu işlemi yapmaya yetkiniz yok!', {
    id: 'unauthorized',
    duration: 4000,
  });
}
