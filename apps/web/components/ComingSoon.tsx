import { SectionIntro } from "@/components/SectionIntro";
import { PageHeader } from "@/components/PageHeader";

interface ComingSoonPageProps {
  title: string;
  description: string;
  phase?: string;
  features?: { title: string; body: string }[];
}

export default function ComingSoonPage({
  title,
  description,
  phase = "Later phase",
  features = [],
}: ComingSoonPageProps) {
  return (
    <div className="coming-soon">
      <PageHeader title={title} description={description} />
      <SectionIntro
        eyebrow={phase}
        title="Module planned in the roadmap"
        body="Navigation is wired so teams can learn the information architecture now. Core inventory, articles, warehouses, and purchasing are live today."
      />
      {features.length > 0 && (
        <div className="coming-soon__grid">
          {features.map((f) => (
            <article key={f.title} className="coming-soon__card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      )}
      <div className="alert alert--info">
        This screen will activate once the underlying transaction workflows are
        implemented for this module.
      </div>
    </div>
  );
}
