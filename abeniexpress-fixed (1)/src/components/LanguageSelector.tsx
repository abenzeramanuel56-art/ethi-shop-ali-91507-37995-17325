import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LABELS: Record<string, string> = {
  en: 'EN',
  am: 'አማ',
  om: 'OR',
  ti: 'ትግ',
};

export const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{LABELS[language] ?? 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          🇬🇧 {t('lang.en')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('am')}
          className={language === 'am' ? 'bg-accent' : ''}
        >
          🇪🇹 {t('lang.am')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('om')}
          className={language === 'om' ? 'bg-accent' : ''}
        >
          🇪🇹 {t('lang.om')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ti')}
          className={language === 'ti' ? 'bg-accent' : ''}
        >
          🇪🇹 {t('lang.ti')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
