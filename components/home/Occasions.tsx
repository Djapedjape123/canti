import type { Dictionary } from "@/lib/dictionaries";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const icons: IconName[] = ["heart", "gift", "sparkle"];

export function Occasions({ dict }: { dict: Dictionary }) {
  const t = dict.occasions;

  return (
    <section aria-labelledby="prilike-title" className="bg-brand-800 py-20 text-cream-50 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="prilike-title" eyebrow={t.eyebrow} title={t.title} tone="dark" align="center" />
        </Reveal>

        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3 lg:gap-8">
          {t.items.map((item, i) => (
            <li key={item.title}>
              <Reveal delay={i * 100} className="h-full">
                <div className="h-full rounded-xl border border-cream-50/10 bg-brand-900/40 p-8 transition-colors duration-300 hover:border-gold-500/40 lg:p-10">
                  <Icon name={icons[i % icons.length]} className="size-10 text-gold-500" />
                  <h3 className="mt-6 font-serif text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-cream-50/75">{item.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-12 max-w-xl text-center font-serif text-lg italic text-cream-50/80">
          {t.note}
        </p>
      </Container>
    </section>
  );
}
