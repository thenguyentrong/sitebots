import { notFound } from 'next/navigation';

// Any address no page answers. Without it Next would show its own unstyled 404 outside the [lang] root
// layout; through here the 404 has the site's header and the visitor's language.
export default function Missing() {
  notFound();
}
