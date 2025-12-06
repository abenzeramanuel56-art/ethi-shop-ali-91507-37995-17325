import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Download } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/LanguageContext";

interface Wallet {
  current_balance_etb: number;
  total_earned_etb: number;
}

interface WithdrawalRequest {
  id: string;
  amount_etb: number;
  payment_method: string;
  status: string;
  created_at: string;
  processed_at: string;
  admin_notes: string;
}

export default function ResellerWallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe">("telebirr");
  const [accountDetail1, setAccountDetail1] = useState("");
  const [accountDetail2, setAccountDetail2] = useState("");

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: walletData } = await supabase
      .from("reseller_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setWallet(walletData);

    const { data: withdrawalData } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setWithdrawals(withdrawalData || []);
    setLoading(false);
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: t('common.error'),
        description: t('wallet.invalidAmount'),
        variant: "destructive"
      });
      return;
    }

    if (amount > (wallet?.current_balance_etb || 0)) {
      toast({
        title: t('common.error'),
        description: t('wallet.insufficientBalance'),
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        amount_etb: amount,
        payment_method: paymentMethod,
        account_detail_1: accountDetail1,
        account_detail_2: accountDetail2 || null,
        status: "pending"
      });

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: t('common.success'),
      description: t('wallet.requestSubmitted')
    });

    setWithdrawAmount("");
    setAccountDetail1("");
    setAccountDetail2("");
    await fetchWalletData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          {t('wallet.title')}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('wallet.currentBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{wallet?.current_balance_etb.toFixed(2) || "0.00"} {t('common.etb')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('wallet.totalEarned')}: {wallet?.total_earned_etb.toFixed(2) || "0.00"} {t('common.etb')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {t('wallet.requestWithdrawal')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                <div>
                  <Label htmlFor="amount">{t('wallet.amount')} *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label>{t('wallet.paymentMethod')} *</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "telebirr" | "cbe")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="telebirr" id="telebirr" />
                      <Label htmlFor="telebirr">{t('wallet.telebirr')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cbe" id="cbe" />
                      <Label htmlFor="cbe">{t('wallet.cbe')}</Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === "telebirr" && (
                  <div>
                    <Label htmlFor="phone">{t('wallet.phoneNumber')} *</Label>
                    <Input
                      id="phone"
                      value={accountDetail1}
                      onChange={(e) => setAccountDetail1(e.target.value)}
                      placeholder="+251..."
                      required
                    />
                  </div>
                )}

                {paymentMethod === "cbe" && (
                  <>
                    <div>
                      <Label htmlFor="accountName">{t('wallet.accountHolderName')} *</Label>
                      <Input
                        id="accountName"
                        value={accountDetail1}
                        onChange={(e) => setAccountDetail1(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">{t('wallet.accountNumber')} *</Label>
                      <Input
                        id="accountNumber"
                        value={accountDetail2}
                        onChange={(e) => setAccountDetail2(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <Button type="submit">{t('wallet.submitRequest')}</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('wallet.withdrawalHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-muted-foreground">{t('wallet.noWithdrawals')}</p>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((wd) => (
                  <Card key={wd.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{wd.amount_etb} {t('common.etb')}</p>
                          <p className="text-sm text-muted-foreground">
                            {wd.payment_method.toUpperCase()} • {new Date(wd.created_at).toLocaleDateString()}
                          </p>
                          {wd.admin_notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Note: {wd.admin_notes}
                            </p>
                          )}
                        </div>
                        <Badge variant={wd.status === "paid" ? "default" : "secondary"}>
                          {wd.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}