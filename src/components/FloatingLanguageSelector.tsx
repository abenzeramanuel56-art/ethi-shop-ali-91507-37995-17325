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

/**
 * Always-visible language switcher pinned to the top-right of the viewport.
 * Lives outside the Navbar so it's available on every page, including
 * pages that don't render the Navbar (e.g. auth, application flows).
 */
export const FloatingLanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="fixed top-3 right-3 z-[60]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-background/80 backdrop-blur-md border-border/60 shadow-md"
          >
            <Globe className="h-4 w-4" />
            <span>{LABELS[language] ?? 'EN'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
            🇬🇧 {t('lang.en')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage('am')} className={language === 'am' ? 'bg-accent' : ''}>
            🇪🇹 {t('lang.am')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage('om')} className={language === 'om' ? 'bg-accent' : ''}>
            🇪🇹 {t('lang.om')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage('ti')} className={language === 'ti' ? 'bg-accent' : ''}>
            🇪🇹 {t('lang.ti')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
