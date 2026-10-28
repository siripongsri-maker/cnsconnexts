import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminToken, useAdminAuth } from '@/lib/admin-auth';
import { getAdminLoginHistory } from '@/lib/admin-auth.functions';

export const Route = createFileRoute('/admin/login-history')({
  head: () => ({ meta: [
    { title: 'ประวัติการเข้าสู่ระบบหลังบ้าน — คนส. Connexts' },
    { name: 'description', content: 'ประวัติวันเวลา บัญชี และผลการเข้าสู่ระบบสำหรับผู้ดูแล คนส. Connexts' },
    { property: 'og:title', content: 'ประวัติการเข้าสู่ระบบหลังบ้าน — คนส. Connexts' },
    { property: 'og:description', content: 'ตรวจสอบความปลอดภัยการเข้าสู่ระบบหลังบ้าน' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: LoginHistory,
});

function LoginHistory() {
  const { role, authed } = useAdminAuth();
  const allowed = authed && (role === 'superadmin' || role === 'owner');
  const history = useQuery({
    queryKey: ['admin-login-history'], enabled: allowed,
    queryFn: () => getAdminLoginHistory({ data: { token: getAdminToken() ?? '' } }),
  });
  if (!allowed) return <p role="alert">บัญชีนี้ไม่มีสิทธิ์ดูประวัติการเข้าสู่ระบบ</p>;
  return <section className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2"><ShieldCheck className="size-5" /> ล่าสุด {history.data?.length ?? 0} รายการ · เวลาประเทศไทย</p>
      <Button variant="outline" disabled={history.isFetching} onClick={() => history.refetch()}><RefreshCw className="size-4" /> รีเฟรช</Button>
    </div>
    {history.isPending ? <p role="status">กำลังโหลดประวัติ…</p> : history.isError ? <p role="alert">โหลดประวัติไม่สำเร็จ กรุณาลองใหม่</p> : <div className="overflow-x-auto">
      <table className="w-full text-left text-body">
        <thead className="border-b border-border"><tr>{['วันเวลา', 'บัญชี', 'วิธีเข้าสู่ระบบ', 'ผล', 'เหตุผล'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{history.data?.map(row => <tr key={row.id} className="border-b border-border">
          <td className="whitespace-nowrap p-3">{new Date(row.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'medium' })}</td>
          <td className="p-3 break-all">{row.account}</td><td className="p-3">{row.method === 'google' ? 'Google' : 'รหัสผ่าน'}</td>
          <td className={row.outcome === 'success' ? 'p-3 text-primary' : 'p-3 text-destructive'}>{row.outcome === 'success' ? 'สำเร็จ' : 'ปฏิเสธ'}</td><td className="p-3">{row.reason || '—'}</td>
        </tr>)}</tbody>
      </table>
      {history.data?.length === 0 && <p className="py-8 text-muted-foreground">ยังไม่มีประวัติการเข้าสู่ระบบ</p>}
    </div>}
  </section>;
}