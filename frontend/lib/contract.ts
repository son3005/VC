import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import abi from './abi/CertificateRegistry.json';
import { CONTRACT_ADDRESS, RPC_URL, CHAIN_ID, CHAIN_ID_HEX } from './constants';
import { beginLoading, endLoading, updateLoadingMessage } from './loading-store';

export { CONTRACT_ADDRESS };

export function getReadContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Chưa cấu hình NEXT_PUBLIC_CONTRACT_ADDRESS.');
  }
  const rpc = RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new JsonRpcProvider(rpc);
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function getWriteContract() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('NO_METAMASK');
  }
  if (!CONTRACT_ADDRESS) {
    throw new Error('Chưa cấu hình NEXT_PUBLIC_CONTRACT_ADDRESS.');
  }
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function assertCorrectNetworkAndSigner(expectedWallet?: string | null) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Vui lòng cài đặt và mở tiện ích MetaMask.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error(`Vui lòng chuyển mạng sang Sepolia (${CHAIN_ID_HEX}).`);
  }

  if (expectedWallet) {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== expectedWallet.toLowerCase()) {
      throw new Error(
        'Ví MetaMask đang chọn không khớp với ví tài khoản đã đăng nhập.'
      );
    }
  }
}

export async function issueCertificateOnChain(
  certificateId: string,
  fileHash: string,
  cid: string
): Promise<string> {
  beginLoading('Đang chờ ký giao dịch cấp chứng chỉ...');
  try {
    const contract = await getWriteContract();
    const tx = await contract.issueCertificate(certificateId, fileHash, cid);
    updateLoadingMessage('Đang chờ xác nhận giao dịch trên Sepolia...');
    const receipt = await tx.wait();
    return receipt.hash;
  } finally {
    endLoading();
  }
}

export async function revokeCertificateOnChain(
  certificateId: string
): Promise<string> {
  beginLoading('Đang chờ ký giao dịch thu hồi...');
  try {
    const contract = await getWriteContract();
    const tx = await contract.revokeCertificate(certificateId);
    updateLoadingMessage('Đang chờ xác nhận giao dịch trên Sepolia...');
    const receipt = await tx.wait();
    return receipt.hash;
  } finally {
    endLoading();
  }
}

export async function addIssuerOnChain(
  wallet: string,
  name: string
): Promise<string> {
  beginLoading('Đang chờ ký giao dịch thêm đơn vị cấp...');
  try {
    const contract = await getWriteContract();
    const tx = await contract.addIssuer(wallet, name);
    updateLoadingMessage('Đang chờ xác nhận giao dịch trên Sepolia...');
    const receipt = await tx.wait();
    return receipt.hash;
  } finally {
    endLoading();
  }
}
