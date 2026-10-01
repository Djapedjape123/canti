import type { Dictionary } from "@/lib/dictionaries";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export function Highlights({ dict }: { dict: Dictionary }) {
  const t = dict.highlights;
  const items: { icon: IconName; title: string; detail: string | null }[] = [
    { icon: "jacuzzi", ...t.jacuzzi },
    { icon: "pin", ...t.location },
    { icon: "car", ...t.parking },
    { icon: "key", ...t.checkin },
  ];

  return (
    <section aria-label={t.label} className="border-b border-sand-200 bg-cream-100">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 md:py-12 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-sand-200">
          {items.map((item, i) => (
            <li key={item.icon} className="lg:px-6 lg:first:pl-0">
              <Reveal delay={i * 80} className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream-50 ring-1 ring-sand-200">
                  <Icon name={item.icon} className="size-6 text-gold-600" />
                </span>
                <div>
                  <p className="font-serif text-lg font-semibold leading-snug text-ink-900">{item.title}</p>
                  {item.detail ? <p className="mt-1 text-sm text-ink-600">{item.detail}</p> : null}
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
