'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { WalletBadge } from '@/components/wallet/WalletBadge';
import { TxStatus, type TxState } from '@/components/tx/TxStatus';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { api } from '@/lib/api';
import {
  addIssuerOnChain,
  removeIssuerOnChain,
  assertCorrectNetworkAndSigner,
} from '@/lib/contract';
import type { Issuer } from '@/types/api';
import {
  Building2,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminIssuersPage() {
  const { user } = useAuth();
  const { isCorrectNetwork, switchToSepolia } = useWallet();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State thêm mới Issuer
  const [issuerName, setIssuerName] = useState('');
  const [issuerCode, setIssuerCode] = useState('');
  const [issuerWallet, setIssuerWallet] = useState('');
  const [issuerWebsite, setIssuerWebsite] = useState('');
  const [issuerEmail, setIssuerEmail] = useState('');
  const [issuerPassword, setIssuerPassword] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const [deactivatingIssuer, setDeactivatingIssuer] = useState<Issuer | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminIssuers'],
    queryFn: () => api.issuers(),
    staleTime: 15 * 1000,
  });

  const issuers = data?.data || [];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!issuerName.trim()) errors.name = 'Tên đơn vị không được để trống';
    if (!issuerCode.trim()) errors.code = 'Mã đơn vị không được để trống (VD: FIT-UIT)';
    if (!issuerWallet.trim()) {
      errors.wallet = 'Địa chỉ ví không được để trống';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(issuerWallet.trim())) {
      errors.wallet = 'Địa chỉ ví Ethereum không hợp lệ (phải bắt đầu bằng 0x và đủ 42 ký tự)';
    }

    if (issuerWebsite.trim()) {
      try {
        const u = new URL(issuerWebsite.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          errors.website = 'Địa chỉ website chỉ chấp nhận giao thức http:// hoặc https://';
        }
      } catch {
        errors.website = 'Địa chỉ website không hợp lệ (Ví dụ: https://fit.uit.edu.vn)';
      }
    }

    if (!issuerEmail.trim()) {
      errors.email = 'Email đăng nhập không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(issuerEmail.trim())) {
      errors.email = 'Email không đúng định dạng';
    }

    if (!issuerPassword || issuerPassword.length < 8) {
      errors.password = 'Mật khẩu phải từ 8 ký tự trở lên';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setTxError(null);
    setTxState('prompting');
    setIsSubmitting(true);

    try {
      // 1. Kiểm tra ví Admin và mạng Sepolia
      await assertCorrectNetworkAndSigner(user?.walletAddress);

      // 2. Ký giao dịch on-chain trên Smart Contract
      const hash = await addIssuerOnChain(issuerWallet.trim(), issuerName.trim());
      setTxHash(hash);
      setTxState('mining');

      // 3. Báo cho Backend lưu thông tin đơn vị vào hệ thống
      await api.createIssuer({
        name: issuerName.trim(),
        code: issuerCode.trim().toUpperCase(),
        walletAddress: issuerWallet.trim(),
        website: issuerWebsite.trim() || undefined,
        email: issuerEmail.trim(),
        password: issuerPassword,
        txHash: hash,
      });

      setTxState('success');
      toast.success('Đã thêm đơn vị cấp mới thành công trên Blockchain!');

      setTimeout(() => {
        setIsAddModalOpen(false);
        setTxState('idle');
        setIssuerName('');
        setIssuerCode('');
        setIssuerWallet('');
        setIssuerWebsite('');
        setIssuerEmail('');
        setIssuerPassword('');
        refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string };

      if (errorObj?.code === 4001 || errorObj?.message?.includes('user rejected')) {
        setTxState('rejected');
        setTxError('Bạn đã từ chối giao dịch trên MetaMask.');
        toast.error('Giao dịch bị từ chối.');
      } else {
        setTxState('error');
        setTxError(errorObj?.message || 'Có lỗi xảy ra khi tạo đơn vị cấp.');
        toast.error('Thêm đơn vị cấp thất bại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateIssuer = async () => {
    if (!deactivatingIssuer) return;
    setIsDeactivating(true);

    try {
      await assertCorrectNetworkAndSigner(user?.walletAddress);
      const txHash = await removeIssuerOnChain(deactivatingIssuer.walletAddress);
      await api.deactivateIssuer(deactivatingIssuer.id, txHash);
      toast.success('Đã khoá quyền cấp chứng chỉ của đơn vị.');
      setDeactivatingIssuer(null);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string };
      if (errorObj?.code === 4001) {
        toast.error('Bạn đã từ chối ký giao dịch.');
      } else {
        toast.error(errorObj?.message || 'Không thể khoá đơn vị cấp.');
      }
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
              Quản lý Đơn vị Đào tạo & Cấp bằng (Issuers)
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5C4A]">
              Ủy quyền cho các khoa, viện, hoặc trường đại học thành viên thực hiện quyền cấp phát văn bằng on-chain
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#E6AB42]" />
            <span>Thêm đơn vị cấp mới</span>
          </Button>
        </div>

        {/* Danh sách Issuers */}
        {isLoading ? (
          <div className="p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Lỗi tải danh sách đơn vị"
            description="Không thể kết nối đến máy chủ. Vui lòng thử lại."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tải lại
              </Button>
            }
          />
        ) : issuers.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-8 h-8 text-[#A48B73]" />}
            title="Chưa có đơn vị cấp nào"
            description="Hệ thống hiện tại chưa có đơn vị đào tạo nào được cấp quyền phát hành văn bằng trên smart contract."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Thêm đơn vị đầu tiên</span>
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#010E1C] border-collapse">
                <thead className="bg-[#FAF4DF] border-b border-[#E3D5B8] text-xs uppercase tracking-wider text-[#6F5C4A]">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Tên đơn vị đào tạo
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Mã đơn vị
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Địa chỉ ví ủy quyền on-chain
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                      Trạng thái Chain
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                      Hệ thống
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Website
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D5B8]/60">
                  {issuers.map((issuer) => (
                    <tr key={issuer.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-serif font-bold text-sm text-[#010E1C]">
                          {issuer.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-[#6F5C4A]">
                        {issuer.code}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        <WalletBadge address={issuer.walletAddress} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        {issuer.onChainActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#010E1C] bg-[#FAF4DF] px-2.5 py-0.5 rounded-full border border-[#E3D5B8]">
                            <CheckCircle2 className="w-3 h-3 text-[#E6AB42]" />
                            <span>Đã kích hoạt</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B23F4A] bg-[#E6606A]/10 px-2.5 py-0.5 rounded-full border border-[#E6606A]/30">
                            <XCircle className="w-3 h-3" />
                            <span>Chưa cấp</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            issuer.isActive ? 'bg-[#E6AB42]' : 'bg-neutral-300'
                          }`}
                          title={issuer.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                        />
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                        {issuer.website &&
                        (issuer.website.startsWith('http://') || issuer.website.startsWith('https://')) ? (
                          <a
                            href={issuer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#6F5C4A] hover:text-[#010E1C] underline"
                          >
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[#A48B73]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {issuer.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-[#B23F4A] border-[#E6606A]/40"
                            onClick={() => setDeactivatingIssuer(issuer)}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Khoá</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#A48B73]">
                            Đã khoá
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Thêm Đơn vị cấp mới */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            if (!isSubmitting) {
              setIsAddModalOpen(false);
              setTxState('idle');
            }
          }}
          title="Thêm đơn vị đào tạo mới"
          description="Hành động này sẽ thực thi hàm addIssuer trên Smart Contract để trao quyền cấp văn bằng cho địa chỉ ví."
          maxWidth="md"
        >
          <form onSubmit={handleCreateIssuer} className="space-y-4 pt-2">
            <Input
              label="Tên đơn vị đào tạo"
              placeholder="Khoa Công nghệ Thông tin - Trường ĐH CNTT"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              error={formErrors.name}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Mã đơn vị (Code)"
                placeholder="UIT-FIT"
                value={issuerCode}
                onChange={(e) => setIssuerCode(e.target.value)}
                error={formErrors.code}
                className="font-mono uppercase"
                disabled={isSubmitting}
              />

              <Input
                label="Trang thông tin (Website - http/https)"
                placeholder="https://fit.uit.edu.vn"
                value={issuerWebsite}
                onChange={(e) => setIssuerWebsite(e.target.value)}
                error={formErrors.website}
                disabled={isSubmitting}
              />
            </div>

            <Input
              label="Địa chỉ ví Blockchain (Ethereum Sepolia)"
              placeholder="0x..."
              value={issuerWallet}
              onChange={(e) => setIssuerWallet(e.target.value)}
              error={formErrors.wallet}
              className="font-mono text-xs"
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email đăng nhập của đơn vị"
                type="email"
                placeholder="issuer@fit.uit.edu.vn"
                value={issuerEmail}
                onChange={(e) => setIssuerEmail(e.target.value)}
                error={formErrors.email}
                autoComplete="off"
                disabled={isSubmitting}
              />

              <Input
                label="Mật khẩu đăng nhập"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={issuerPassword}
                onChange={(e) => setIssuerPassword(e.target.value)}
                error={formErrors.password}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-[11px] text-[#6F5C4A]">
              Hệ thống sẽ tự tạo tài khoản <code>issuer</code> với email này để đơn vị đăng nhập tại <code>/login</code>.
            </p>

            {/* Trạng thái Transaction */}
            <TxStatus
              state={txState}
              txHash={txHash}
              errorMessage={txError}
            />

            {!isCorrectNetwork && (
              <div className="p-3 rounded-xl bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-center justify-between">
                <span>Cần chuyển sang mạng Sepolia để ký ví Admin.</span>
                <Button variant="danger" size="sm" onClick={() => switchToSepolia()}>
                  Đổi mạng
                </Button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3D5B8]/60">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!isCorrectNetwork || txState === 'success'}
                className="gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
                <span>Ký on-chain & Thêm Issuer</span>
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal khoá issuer */}
        <Modal
          isOpen={!!deactivatingIssuer}
          onClose={() => {
            if (!isDeactivating) setDeactivatingIssuer(null);
          }}
          title="Khoá quyền cấp chứng chỉ"
          maxWidth="md"
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <strong>ĐƠN VỊ SẼ KHÔNG THỂ CẤP CHỨNG CHỈ MỚI</strong>
                <p>
                  Giao dịch <code>removeIssuer</code> sẽ được ký on-chain. Các chứng chỉ cũ vẫn tra cứu được.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#6F5C4A]">
              Đơn vị: <strong className="text-[#010E1C]">{deactivatingIssuer?.name}</strong>
              <br />
              Mã: <strong className="font-mono">{deactivatingIssuer?.code}</strong>
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3D5B8]/60">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeactivatingIssuer(null)}
                disabled={isDeactivating}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isDeactivating}
                disabled={!isCorrectNetwork}
                onClick={handleDeactivateIssuer}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Xác nhận khoá on-chain</span>
              </Button>
            </div>
          </div>
        </Modal>
      </Container>
    </div>
  );
}
