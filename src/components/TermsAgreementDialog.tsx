import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

interface TermsAgreementDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsAgreementDialog({ open, onAccept }: TermsAgreementDialogProps) {
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);

  const termsContent = `📄 Full E-commerce Website Agreement (Terms & Conditions)
Last Updated: December 13, 2025

Welcome to our E-commerce Platform ("Website," "we," "us," or "our"). These Terms and Conditions (T&Cs) govern your use of the Website and the purchase of products. By accessing or using our site, you agree to these rules.

1. 🤝 General Provisions
1.1 Acceptance of Terms
By using this Website, you agree to these T&Cs. If you are under the age of majority, you must have permission from a parent or guardian.

1.2 Account Responsibility 🔑
You are responsible for keeping your account password secure. You accept responsibility for all activities that happen under your account. Please notify us immediately if you suspect unauthorized use.

2. 💰 Product Pricing and Tax Responsibility (Delivery Duties Unpaid - DDU)
2.1 Pricing Basis (Tax Excluded)
All product prices displayed are for the item itself and are exclusive of any applicable taxes, VAT, customs duties, or import fees 🚫 imposed by your local government.

2.2 Your Tax Responsibility (DDU - Delivery Duties Unpaid) 🗺️
You are the Importer of Record. This means you are solely responsible for paying any duties, customs fees, or local taxes 🧾 that are assessed upon or after the order arrives in your country.

2.3 Product Accuracy
While we aim for perfection, we do not warrant that all product descriptions, colors, or images are 100% accurate or error-free.

3. 📦 Order Processing and Shipping
3.1 Order Acceptance
Receiving an order confirmation email means we received your request, not that we have accepted your order. We reserve the right to accept or decline any order.

3.2 Estimated Shipping Date ⏳
The shipping date provided is an estimated delivery timeline calculated based on the average delivery times observed over the last three (3) months. This is an estimate only and is NOT a guarantee of delivery time.

3.3 Refusal to Accept Delivery 🛑
If you refuse delivery or fail to pay the required duties/taxes upon arrival, the package may be returned, held, or destroyed.

4. 🚨 Strict Anti-Fraud and Payment Policy (Zero Tolerance)
4.1 Prohibited Fraudulent Activity
Any attempt to deceive or submit false payment information is strictly prohibited. This includes:
- Using stolen payment methods.
- Sending a Fake Payment Screenshot 📸❌: Submitting counterfeit, edited, or manipulated proof of payment when the funds did not clear.

4.2 Consequences of Fraud 🚫
ANY user found engaging in fraud, especially submitting fake payment proof, will be:
- Immediately and permanently banned 🔒 from using the Website and related services.
- Subject to order cancellation without refund.
- Reported to law enforcement 🚔, and we will pursue all available legal remedies to recover losses.

5. 🧑‍💻 Reseller/Wholesale Wallet Terms
5.1 Authorization for Wallet Deductions ➖
If you are an approved Reseller Partner with a wallet balance, you explicitly authorize us to automatically deduct funds from your wallet for specific reasons, without requiring individual consent for each deduction.

5.2 Reasons for Deduction
Deductions will occur only for:
- Customer Refunds 💸: Covering refunds issued for returns, cancellations, or damages related to your sales.
- Chargebacks and Disputes: Recovering the amount of any payment dispute initiated by an end customer, plus associated bank fees.
- Outstanding Fees: Settling any service fees, commissions, or non-payment penalties owed to us.

5.3 Notification
We will provide detailed records and notifications 📧 for all deductions made from your Reseller Wallet.

6. ⚖️ Legal and Governing Terms
6.1 Limitation of Liability
We are not liable for any indirect or consequential damages (like lost profits or lost data) that result from the use of, or inability to use, the products or the Website.

6.2 Governing Law
These T&Cs shall be governed by and construed in accordance with the laws of Ethiopia.

7. ❓ Contact Information
Questions about these Terms and Conditions should be directed to us at support@platform.com.`;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {termsContent}
          </div>
        </ScrollArea>
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox 
            id="terms" 
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
            I have read and agree to the Terms & Conditions
          </label>
        </div>
        <DialogFooter>
          <Button onClick={onAccept} disabled={!agreed} className="w-full">
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
