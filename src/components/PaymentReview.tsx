import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignedImage, openSignedUrl } from '@/components/SignedImage';
import { toast } from 'sonner';

type Details = { cbe: { name: string; account: string }; telebirr: { name: string; account: string }; expected_sender_enabled: boolean };
type Review = { order_id: string; state: string; reason: string | null; method: string | null; payment_method: string | null; transaction_id: string | null; reference_id: string | null; request_id: string | null; verified_amount: number | null; attempts: number; service_error: boolean; orders: { total_etb: number; customer_id: string; payment_proof_url: string | null; order_items: { product_name: string; quantity: number; price_etb: number }[] } };

export function PaymentReview({ onChange }: { onChange: () => void }) {
  const { t } = useLanguage();
  const pt = (key: string) => t(`payment.${key}`);
  const [rows, setRows] = useState<Review[]>([]);
  const [filter, setFilter] = useState('pending_review');
  const [details, setDetails] = useState<Details | null>(null);
  const [status, setStatus] = useState<{ healthy: boolean; mode: string | null }>({ healthy: false, mode: null });
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [history, setHistory] = useState<{ state: string; reason: string | null; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const load = async () => {
    const { data, error } = await supabase.from('payment_verifications').select('*,orders(total_etb,customer_id,payment_proof_url,order_items(product_name,quantity,price_etb))').order('updated_at', { ascending: false });
    if (error) { toast.error(pt('review_error')); return; }
    const records = data as unknown as Review[];
    setRows(records);
    const ids = [...new Set(records.map(r => r.orders.customer_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', ids);
      setNames(Object.fromEntries((profiles || []).map(p => [p.id, p.full_name])));
    }
  };
  useEffect(() => {
    load();
    supabase.from('app_settings').select('value').eq('key', 'checkout_payment_details').maybeSingle().then(({ data }) => { if (data) setDetails(data.value as unknown as Details); });
    supabase.functions.invoke('payment-service-status').then(({ data }) => { if (data) setStatus(data); });
  }, []);
  const open = async (id: string) => {
    setSelected(id); setReason(''); setReceiptId('');
    const { data } = await supabase.from('payment_verification_events').select('state,reason,created_at').eq('order_id', id).order('created_at');
    setHistory(data || []);
  };
  const review = async (approve: boolean) => {
    if (!selected || busy || reason.trim().length < 3) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_review_payment_with_receipt', { p_order_id: selected, p_approve: approve, p_reason: reason.trim(), p_receipt_id: receiptId.trim() || null });
    if (error) toast.error(error.message.includes('receipt_used') ? pt('receipt_used') : pt('review_error'));
    else {
      if ((data as { state?: string })?.state === 'confirmed') {
        await supabase.functions.invoke('send-receipt', { body: { orderId: selected } });
      }
      setSelected(null); await load(); onChange();
    }
    setBusy(false);
  };
  const save = async () => {
    if (!details || busy) return;
    if (![details.cbe.name, details.cbe.account, details.telebirr.name, details.telebirr.account].every(v => v.trim().length > 0)) return;
    setBusy(true);
    const { error } = await supabase.from('app_settings').update({ value: details }).eq('key', 'checkout_payment_details');
    toast[error ? 'error' : 'success'](pt(error ? 'settings_permission' : 'saved_settings'));
    setBusy(false);
  };
  return <section className="space-y-6">
    <div className="flex flex-wrap gap-4 border-b border-border pb-4">
      <h2 className="text-xl font-bold">{pt('review')} · {rows.filter(r => r.state === 'pending_review').length} {pt('pending_count')}</h2>
      <p className={status.healthy ? 'text-success' : 'text-warning'}>{pt('health')}: {pt(status.healthy ? 'healthy' : 'unavailable')}</p>
      <p>{pt('mode')}: {status.mode || pt('unconfigured')}</p>
    </div>
    <details className="border-b border-border pb-4"><summary className="cursor-pointer font-bold">{pt('details')}</summary>
      {details && <div className="space-y-3 mt-4">
        {(['cbe', 'telebirr'] as const).map(method => <div key={method} className="grid gap-3 sm:grid-cols-2">
          <div><Label>{method.toUpperCase()} · {pt('name')}</Label><Input value={details[method].name} onChange={e => setDetails({ ...details, [method]: { ...details[method], name: e.target.value } })} /></div>
          <div><Label>{pt(method === 'cbe' ? 'account' : 'phone')}</Label><Input value={details[method].account} onChange={e => setDetails({ ...details, [method]: { ...details[method], account: e.target.value } })} /></div>
        </div>)}
        <label className="flex gap-2 items-center"><input type="checkbox" checked={details.expected_sender_enabled} onChange={e => setDetails({ ...details, expected_sender_enabled: e.target.checked })} />{pt('sender')}</label>
        <Button disabled={busy} onClick={save}>{pt('save')}</Button>
      </div>}
    </details>
    <div className="flex flex-wrap gap-2">{['all', 'confirmed', 'pending_review', 'failed', 'rejected'].map(state => <Button key={state} variant={filter === state ? 'default' : 'outline'} onClick={() => setFilter(state)}>{pt(state)}</Button>)}</div>
    <div className="space-y-3">{rows.filter(r => filter === 'all' || r.state === filter).map(row => <article key={row.order_id} className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><p className="font-mono break-all">#{row.order_id}</p><p>{pt(row.state)}</p></div>
      <p>{pt('customer')}: {names[row.orders.customer_id] || row.orders.customer_id}</p>
      {row.orders.order_items.map((item, index) => <p key={index}>{item.product_name} × {item.quantity} · {item.price_etb} ETB</p>)}
      <p>{pt('total')}: {row.orders.total_etb} ETB · {pt('amount')}: {row.verified_amount ?? '—'}</p>
      <p>{pt('method')}: {row.payment_method} / {row.method} · {pt('attempts')}: {row.attempts}</p>
      <p className="break-all">{pt('transaction')}: {row.transaction_id || '—'} · {pt('provider_reference')}: {row.reference_id || '—'}</p>
      <p className="break-all">{pt('request')}: {row.request_id || '—'}</p>
      {row.reason && <p className={row.service_error ? 'text-warning' : 'text-muted-foreground'}>{pt(row.reason)}</p>}
      {row.orders.payment_proof_url && <><SignedImage url={row.orders.payment_proof_url} alt={pt('receipt')} className="max-h-32 object-contain" /><Button variant="outline" onClick={() => openSignedUrl(row.orders.payment_proof_url)}>{pt('view')}</Button></>}
      <Button variant="outline" onClick={() => open(row.order_id)}>{pt('history')}</Button>
      {selected === row.order_id && <div className="space-y-3 border-t border-border pt-3">
        {history.map((event, i) => <p key={i} className="text-xs">{new Date(event.created_at).toLocaleString()} · {pt(event.state)} {event.reason ? pt(event.reason) : ''}</p>)}
        {row.state === 'pending_review' && <><Label>{pt('reason')}</Label><Textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /><Label>{pt('manual_id')}</Label><Input maxLength={64} value={receiptId} onChange={e => setReceiptId(e.target.value)} /><div className="flex gap-2"><Button disabled={busy || reason.trim().length < 3 || (!row.transaction_id && !row.reference_id && !receiptId.trim())} onClick={() => review(true)}>{pt('approve')}</Button><Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => review(false)}>{pt('reject')}</Button></div></>}
      </div>}
    </article>)}</div>
  </section>;
}