export const SCHOOL_NAME = 'Raccoon University';
export const SCHOOL_TAGLINE = 'Learn & Forage';

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
export const CHAIN_ID_HEX = process.env.NEXT_PUBLIC_CHAIN_ID_HEX || '0xaa36a7';
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || 'Sepolia';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.etherscan.io';
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
export const DEPLOY_BLOCK = Number(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || '0');
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  degree: 'Bằng tốt nghiệp',
  course: 'Chứng chỉ khóa học',
  credit: 'Chứng chỉ tín chỉ',
  other: 'Chứng chỉ khác',
};

export const CERTIFICATE_STATUS_LABELS: Record<string, string> = {
  active: 'Hợp lệ',
  revoked: 'Đã thu hồi',
  locked: 'Tạm khoá',
};
