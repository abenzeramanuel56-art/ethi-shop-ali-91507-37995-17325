import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { TERMS } from "@/content/terms";
import { ScrollText } from "lucide-react";

export default function Terms() {
  const { language } = useLanguage();
  const doc = TERMS[language] ?? TERMS.en;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <article className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ScrollText className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Abeni Express</span>
            </div>
            <h1 className="text-2xl font-black leading-snug md:text-3xl">{doc.title}</h1>
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
              {doc.notice}
            </p>
          </header>

          {doc.sections.map((s) => (
            <section key={s.title} className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">{s.title}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
