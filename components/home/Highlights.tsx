import type { Dictionary } from "@/lib/dictionaries";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";

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
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:py-12 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.icon} className="flex items-start gap-4">
              <Icon name={item.icon} className="size-8 shrink-0 text-gold-600" />
              <div>
                <p className="font-serif text-lg font-semibold leading-snug text-ink-900">{item.title}</p>
                {item.detail ? <p className="mt-1 text-sm text-ink-600">{item.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
