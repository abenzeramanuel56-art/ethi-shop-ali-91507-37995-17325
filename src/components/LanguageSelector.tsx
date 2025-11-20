import React from 'react';
import { useI18n } from '@/i18n/LanguageProvider';

const LanguageSelector: React.FC = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-2">
      <label className="sr-only">{t('common.language', 'Language')}</label>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as 'en' | 'am')}
        className="rounded-md border px-2 py-1 text-sm"
        aria-label="Language selector"
      >
        <option value="en">{t('common.english', 'English')}</option>
        <option value="am">{t('common.amharic', 'Amharic')}</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
