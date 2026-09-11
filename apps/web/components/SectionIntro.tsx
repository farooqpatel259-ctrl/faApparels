interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  body: string;
  items?: string[];
}

export function SectionIntro({ eyebrow, title, body, items }: SectionIntroProps) {
  return (
    <section className="section-intro">
      {eyebrow && <p className="section-intro__eyebrow">{eyebrow}</p>}
      <h2 className="section-intro__title">{title}</h2>
      <p className="section-intro__body">{body}</p>
      {items && items.length > 0 && (
        <ul className="section-intro__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
