import Link from "next/link";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

export default function LegalPage({
  eyebrow,
  title,
  summary,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#05090f] px-6 py-12 text-slate-100 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
        >
          AutoPost Hub
        </Link>
        <p className="mt-16 text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-300">{summary}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-sm leading-7 text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-white/10 pt-6 text-xs text-slate-500">
          Last updated: June 2, 2026
        </p>
      </div>
    </main>
  );
}
