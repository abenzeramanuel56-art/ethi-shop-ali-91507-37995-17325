import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Copy, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

type SavedOrder = { id: string; total: number };
export function CommercePayment({ kind, prepare, existing, onConfirmed }: {
  kind: 'service' | 'digital'; prepare: () => Promise<SavedOrder>; existing?: SavedOrder;
  onConfirmed?: () => void;
}) {
  const { t } = useLanguage();
  const pt = (key: string) => t(`payment.${key}`);
  const navigate = useNavigate();
  const [order, setOrder] = useState<SavedOrder | null>(existing ?? null);
  const [details, setDetails] = useState<Record<string, { name: string; account: string }> | null>(null);
  const [method, setMethod] = useState<'cbe' | 'telebirr'>('cbe');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [id, setId] = useState('');
  const [state, setState] = useState('pending_payment');
  const [reason, setReason] = useState('');
  const [healthy, setHealthy] = useState(false);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'checkout_payment_details').maybeSingle().then(({ data }) => {
      if (data) setDetails(data.value as typeof details);
    });
    supabase.functions.invoke('payment-service-status').then(({ data }) => setHealthy(data?.healthy === true));
    if (existing) supabase.from('commerce_payment_verifications').select('state,reason').eq('order_id', existing.id).maybeSingle().then(({ data }) => {
      if (data) { setState(data.state); setReason(data.reason ?? ''); }
    });
  }, []);
  useEffect(() => {
    if (!file || file.type === 'application/pdf') { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const pick = (next?: File) => {
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(next.type) || next.size <= 0 || next.size > 10485760) {
      toast.error(pt('invalid_file')); return;
    }
    setFile(next);
  };
  const save = async () => {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try { setOrder(await prepare()); } catch { toast.error(pt('prepare_error')); }
    finally { lock.current = false; setWorking(false); }
  };
  const verify = async () => {
    if (!order || lock.current) return;
    if (!id.trim() && !file) { toast.error(pt('missing_input')); return; }
    lock.current = true; setWorking(true); setReason('');
    try {
      const body = new FormData();
      body.append('order_id', order.id); body.append('order_kind', kind);
      body.append('payment_method', method); body.append('transaction_id', id.replace(/\s/g, ''));
      if (file) body.append('receipt', file);
      const { data, error } = await supabase.functions.invoke('verify-payment-receipt', { body });
      if (error || !data || data.saved === false) throw new Error('unsaved');
      setState(data.state); setReason(data.reason ?? 'unknown');
      if (data.state === 'confirmed') onConfirmed?.();
    } catch {
      // Read back before claiming a transport failure saved a receipt.
      const { data } = await supabase.from('commerce_payment_verifications').select('state,reason').eq('order_id', order.id).maybeSingle();
      setState(data?.state ?? 'failed'); setReason(data?.reason ?? 'unknown');
    } finally { lock.current = false; setWorking(false); }
  };
  const terminal = ['confirmed', 'pending_review', 'rejected', 'verifying'].includes(state);
  const receiver = details?.[method];
  return <section className="space-y-4 border-t border-border pt-4">
    {working && <div role="status" aria-live="polite" className="fixed inset-0 z-[100] bg-background/95 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" /><p>{pt(order ? 'verifying' : 'save_order')}</p><p className="text-muted-foreground">{pt('stay')}</p>
    </div>}
    {terminal ? <div role="status" className="space-y-3">
      {state === 'confirmed' ? <CheckCircle2 className="h-9 w-9 text-success" /> : <AlertCircle className="h-9 w-9 text-warning" />}
      <h3 className="font-bold">{pt(state === 'verifying' ? 'in_progress' : state)}</h3>
      {state !== 'confirmed' && <p className="text-warning">{pt(reason === 'attempt_limit' ? reason : state === 'rejected' ? 'rejected_reason' : state === 'verifying' ? 'in_progress' : 'pending')}</p>}
      <p className="break-all font-mono text-sm">{pt('reference')}: {order?.id}</p>
      <Button type="button" onClick={() => navigate('/account')}>{pt('orders')}</Button>
    </div> : !order ? <Button type="button" className="w-full" disabled={working} onClick={save}>{pt('save_order')}</Button> : <>
      {healthy && <div className="border border-primary bg-primary/10 p-3 rounded-md"><strong>{pt('instant')}</strong><p className="text-sm">{pt('banner')}</p></div>}
      <div className="bg-muted p-3 rounded-md"><p>{pt('exact')}</p><strong className="text-xl">{order.total.toLocaleString()} ETB</strong><p className="font-mono text-xs break-all">{pt('reference')}: {order.id}</p></div>
      <Label>{pt('method')}</Label>
      <Select value={method} onValueChange={value => { if (value === 'cbe' || value === 'telebirr') setMethod(value); }}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cbe">Commercial Bank of Ethiopia (CBE)</SelectItem><SelectItem value="telebirr">Telebirr</SelectItem></SelectContent>
      </Select>
      {receiver ? <div className="space-y-2 bg-muted p-3 rounded-md">
        <p>{pt('name')}: {receiver.name}</p><div className="flex flex-wrap items-center gap-2"><p className="break-all">{pt(method === 'cbe' ? 'account' : 'phone')}: <strong>{receiver.account}</strong></p>
          <Button type="button" size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(receiver.account); toast.success(pt('copied')); } catch { toast.error(pt('unknown')); } }}><Copy className="h-4 w-4 mr-1" />{pt('copy')}</Button>
        </div>
      </div> : <p className="text-warning">{pt('settings_error')}</p>}
      <p className="text-sm text-muted-foreground">{pt('either')}</p>
      <Label>{pt('transaction')}<Input maxLength={64} value={id} onChange={e => setId(e.target.value.replace(/\s/g, ''))} /></Label>
      <div className="border border-dashed border-border rounded-md p-4 space-y-2" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
        <p className="text-sm">{pt('drop')}</p><input ref={input} type="file" className="hidden" accept="image/jpeg,image/png,application/pdf" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <Button type="button" variant="outline" onClick={() => input.current?.click()}><Upload className="h-4 w-4 mr-2" />{pt('choose')}</Button>
        {file && <><p className="break-all text-sm">{file.name}</p>{preview && <img src={preview} alt={pt('receipt')} className="max-h-48 max-w-full object-contain" />}<Button type="button" variant="ghost" onClick={() => setFile(null)}>{pt('remove')}</Button></>}
      </div>
      {state === 'failed' && <div role="alert" className="border border-destructive rounded-md p-3 text-destructive"><strong>{pt('failed')}</strong><p>{pt(reason)}</p></div>}
      <Button type="button" className="w-full" disabled={working || !receiver || state === 'rejected'} onClick={verify}>{pt('verify')}</Button>
    </>}
  </section>;
}