import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ApplicationSubmitted() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('apply.applicationReceived')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {t('apply.applicationReceivedDesc')}
              </p>

              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{t('apply.whatHappensNext')}</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• {t('apply.step1')}</li>
                      <li>• {t('apply.step2')}</li>
                      <li>• {t('apply.step3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")} className="w-full">
                  {t('common.backToHome')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/apply-reseller")} className="w-full">
                  {t('apply.checkStatus')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}