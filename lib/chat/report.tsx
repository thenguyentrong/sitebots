/* eslint-disable jsx-a11y/alt-text -- react-pdf's Image has no alt attribute */
import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer, type Styles } from '@react-pdf/renderer';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import sharp from 'sharp';
import { TEXT, guessLang } from './i18n';
import type { ReportData } from './store';
import type { ChatOption } from './tools';

const font = (file: string) => join(process.cwd(), 'data', 'fonts', file);
Font.register({ family: 'Montserrat', fonts: [
  { src: font('Montserrat-Light.ttf'), fontWeight: 300 },
  { src: font('Montserrat-Medium.ttf'), fontWeight: 500 },
  { src: font('Montserrat-Bold.ttf'), fontWeight: 700 },
  { src: font('Montserrat-Black.ttf'), fontWeight: 900 },
] });
Font.register({ family: 'JetBrains Mono', src: font('JetBrainsMono-Medium.ttf') });
// Long URLs and model names must not be split with a hyphen.
Font.registerHyphenationCallback((word) => [word]);

// White paper, ink type, hairlines. Colour comes in only through the photographs.
const INK = '#111111';
const SLATE = '#4A5568';
const MUTED = '#666666';
const LINE = '#E4E4E4';
const MARGIN = 48;
const GUTTER = 118;

const s = StyleSheet.create({
  page: { fontFamily: 'Montserrat', fontWeight: 300, fontSize: 9.5, lineHeight: 1.5, color: INK, paddingTop: 84, paddingBottom: 60, paddingHorizontal: MARGIN },
  cover: { paddingBottom: 0 },
  head: { position: 'absolute', top: 36, left: MARGIN, right: MARGIN, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: 0.75, borderBottomColor: INK },
  brand: { fontWeight: 900, fontSize: 12, lineHeight: 1, letterSpacing: -0.2 },
  foot: { position: 'absolute', top: 804, left: MARGIN, right: MARGIN, flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontFamily: 'JetBrains Mono', fontSize: 7, lineHeight: 1.3, letterSpacing: 1, color: SLATE, textTransform: 'uppercase' },
  title: { fontWeight: 900, fontSize: 30, lineHeight: 1.08, textTransform: 'uppercase', marginTop: 10 },
  sub: { color: MUTED, marginTop: 10 },
  h2: { fontWeight: 900, fontSize: 15, lineHeight: 1.15, textTransform: 'uppercase', marginBottom: 12 },
  name: { fontWeight: 900, fontSize: 22, lineHeight: 1.1, textTransform: 'uppercase', marginTop: 6 },
  frame: { borderWidth: 0.75, borderColor: LINE },
  photo: { width: '100%', objectFit: 'contain' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
  key: { width: GUTTER, paddingTop: 2, paddingRight: 10 },
  value: { flex: 1, fontWeight: 500 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  dot: { width: 3, height: 3, backgroundColor: INK, marginTop: 5, marginRight: 7 },
  columns: { flexDirection: 'row', gap: 24 },
  column: { flex: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: INK, paddingVertical: 20, paddingHorizontal: MARGIN },
  barText: { color: '#FFFFFF', fontSize: 9, lineHeight: 1.5 },
});

const Label = ({ children, style }: { children: ReactNode; style?: Styles[string] }) => <Text style={style ? [s.mono, style] : s.mono}>{children}</Text>;

const Bullets = ({ items }: { items: string[] }) => <>{items.map((item, index) => <View key={index} style={s.bullet}><View style={s.dot} /><Text style={{ flex: 1 }}>{item}</Text></View>)}</>;

/** Hairline rows with the label in a left gutter and one column of content. */
const Rows = ({ rows, gutter = GUTTER }: { rows: [string, string][]; gutter?: number }) => <View>{rows.map(([key, value]) => <View key={key} style={s.row} wrap={false}>
  <View style={[s.key, { width: gutter }]}><Label>{key}</Label></View><Text style={s.value}>{value}</Text>
</View>)}</View>;

const Photo = ({ src, height }: { src: string | undefined; height: number }) => src ? <View style={s.frame}><Image src={src} style={[s.photo, { height }]} /></View> : null;

const plain = (text: string) => text
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '')
  .replace(/\n*\((Asked|Options shown): [^\n]*\)/g, '').replace(/^- /gm, '\u2022 ').trim();

/** The adviser's conclusion without its closing questions, which belong to the chat, not the document. */
const closing = (text: string) => text.replace(/(\s*[^.!?\n]*\?)+\s*$/, '').trim();

/** Everything on one robot gets its own page: picture, figures, reasons, and who to talk to. */
function OptionPage({ option, index, photo, siteUrl, t, alone }: { option: ChatOption; index: number; photo?: string; siteUrl: string; alone: boolean; t: (typeof TEXT)['en' | 'de'] }) {
  const facts: [string, string][] = [
    [t.price, option.price],
    [t.germany, option.status + (option.leadTime ? ', ' + option.leadTime : '')],
    ...(option.proof ? [[t.proof, option.proof] as [string, string]] : []),
    ...option.specs.map((spec): [string, string] => [spec.label, spec.value]),
  ];
  return <View break={!alone} style={alone ? { marginTop: 28 } : undefined}>
    <Label>{t.option} {index + 1} / {option.label}</Label>
    <Text style={s.name}>{option.name}</Text>
    <Text style={[s.sub, { marginTop: 4 }]}>{option.type}, {option.maker}</Text>

    <View style={[s.columns, { marginTop: 16 }]}>
      <View style={s.column}><Photo src={photo} height={151} /></View>
      <View style={s.column}><Rows rows={facts} gutter={84} /></View>
    </View>

    <View style={{ marginTop: 20 }}><Label>{t.why}</Label><Text style={{ marginTop: 5, fontSize: 11 }}>{option.why}</Text></View>

    <View style={[s.columns, { marginTop: 20 }]}>
      <View style={s.column}><Label style={{ marginBottom: 6 }}>{t.pros}</Label><Bullets items={option.pros} /></View>
      <View style={s.column}><Label style={{ marginBottom: 6 }}>{t.cons}</Label><Bullets items={option.cons} /></View>
    </View>
    <View style={[s.columns, { marginTop: 18 }]}>
      <View style={s.column}>{option.confirm.length ? <><Label style={{ marginBottom: 6 }}>{t.confirm}</Label><Bullets items={option.confirm} /></> : null}</View>
      <View style={s.column}>
        <Label style={{ marginBottom: 6 }}>{t.buy}</Label>
        {option.sellers.length ? option.sellers.map((seller) => <Text key={seller.name} style={{ marginBottom: 3 }}>
          {seller.url ? <Link src={seller.url} style={{ color: INK, fontWeight: 700 }}>{seller.name}</Link> : seller.name}{' '}({[seller.country, seller.price].filter(Boolean).join(', ')})
        </Text>) : <Text>{t.noSeller}</Text>}
      </View>
    </View>
    <Link src={siteUrl + option.href} style={{ marginTop: 18, color: INK }}><Label>{t.record}</Label></Link>
  </View>;
}

/** Side by side, so the choice can be read off one table. */
function Glance({ options, photos, t }: { options: ChatOption[]; photos: Record<string, string>; t: (typeof TEXT)['en' | 'de'] }) {
  const labels = [...new Set(options.flatMap((option) => option.specs.map((spec) => spec.label)))];
  const rows: [string, (option: ChatOption) => string][] = [
    [t.price, (option) => option.price],
    [t.germany, (option) => option.status],
    ...labels.map((label): [string, (option: ChatOption) => string] => [label, (option) => option.specs.find((spec) => spec.label === label)?.value ?? '-']),
  ];
  const cell = { flex: 1, paddingRight: 8 };
  return <View wrap={false} style={{ marginTop: 26 }}>
    <Text style={s.h2}>{t.options}</Text>
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: 74 }} />
      {options.map((option) => <View key={option.id} style={cell}>
        <Photo src={photos[option.id]} height={options.length > 3 ? 62 : 84} />
        <Text style={{ fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>{option.name}</Text>
      </View>)}
    </View>
    {rows.map(([label, read]) => <View key={label} style={[s.row, { paddingVertical: 4 }]}>
      <View style={{ width: 74, paddingTop: 2 }}><Label>{label}</Label></View>
      {options.map((option) => <Text key={option.id} style={[cell, { fontSize: 8.5 }]}>{read(option)}</Text>)}
    </View>)}
  </View>;
}

/** The result of a consultation, to keep or pass on: what the job is, what came out and why, what was
 *  checked, and every word of how it got there. */
function Report({ data, siteUrl, photos }: { data: ReportData; siteUrl: string; photos: Record<string, string> }) {
  const people = data.messages.filter((message) => message.role === 'user').map((message) => message.content);
  const language = data.options[0]?.language ?? guessLang(people.join(' '));
  const t = TEXT[language];
  const date = new Date(data.startedAt).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const job = data.brief.find((fact) => fact.key === 'job')?.value ?? people[0] ?? t.report;
  const first = data.options[0];
  const conclusion = [...data.messages].reverse().find((message) => message.role === 'assistant' && message.content.includes('(Options shown:'));
  const facts = data.brief.filter((fact) => fact.state !== 'open' && fact.state !== 'not_needed' && fact.key !== 'shortlist');
  const open = data.brief.filter((fact) => fact.state === 'open').map((fact) => fact.label);
  const skipped = data.brief.filter((fact) => fact.state === 'not_needed').map((fact) => fact.label);
  const checks = [...new Set(data.messages.flatMap((message) => message.trace))];

  const chrome = <>
    <View style={s.head} fixed><Text style={s.brand}>sitebots</Text><Label>{t.report} / {date}</Label></View>
  </>;
  const folio = <View style={s.foot} fixed>
    <Label>{t.footer}</Label>
    <Text style={s.mono} render={({ pageNumber, totalPages }) => String(pageNumber).padStart(2, '0') + ' / ' + String(totalPages).padStart(2, '0')} />
  </View>;

  return <Document title={t.report + ': ' + job} author="sitebots">
    <Page size="A4" style={[s.page, s.cover]}>
      {chrome}
      <Label>{t.report}</Label>
      <Text style={s.title}>{job}</Text>
      <Text style={s.sub}>{t.prepared} {date}</Text>

      {first ? <View style={{ marginTop: 26 }}>
        <Photo src={photos[first.id]} height={290} />
        <View style={{ marginTop: 16 }}>
          <Label>{t.ourSuggestion}</Label>
          <Text style={s.name}>{first.name}</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>{first.type}, {first.maker} / {first.price}</Text>
          <Text style={{ marginTop: 12, fontSize: 11 }}>{(conclusion && closing(plain(conclusion.content))) || first.why}</Text>
        </View>
      </View> : <Text style={{ marginTop: 26 }}>{t.noOptions}</Text>}

      <View style={s.bar} fixed={false}><Text style={s.barText}>{t.notice}</Text></View>
    </Page>

    <Page size="A4" style={s.page}>
      {chrome}{folio}
      <Text style={s.h2}>{t.project}</Text>
      <Rows rows={facts.map((fact): [string, string] => [fact.label, fact.value + (fact.state === 'assumed' ? ' ' + t.assumed : '')])} />
      {open.length ? <Rows rows={[[t.stillOpen, open.join(', ')]]} /> : null}
      {skipped.length ? <Rows rows={[[t.notImportant, skipped.join(', ')]]} /> : null}
      {data.options.length > 1 ? <Glance options={data.options} photos={photos} t={t} /> : null}

      {data.options.map((option, index) => <OptionPage key={option.id} option={option} index={index} photo={photos[option.id]} siteUrl={siteUrl} t={t} alone={data.options.length === 1} />)}

      <View break>
        {data.leftOut.length ? <View style={{ marginBottom: 24 }}>
          <Text style={s.h2}>{t.leftOut}</Text>
          <Rows rows={data.leftOut.map((item): [string, string] => [item.name, item.reason])} />
        </View> : null}
        {checks.length ? <View style={{ marginBottom: 24 }}><Text style={s.h2}>{t.checked}</Text><Bullets items={checks} /></View> : null}
        <Text style={s.h2}>{t.conversation}</Text>
        {data.messages.map((message) => {
          const text = plain(message.content);
          return text ? <View key={message.id} wrap={text.length > 700} minPresenceAhead={36} style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ width: 62, paddingTop: 2 }}><Label>{message.role === 'user' ? t.you : t.adviser}</Label></View>
            <Text style={{ flex: 1, fontWeight: message.role === 'user' ? 500 : 300 }}>{text}</Text>
          </View> : null;
        })}
        <View wrap={false} style={{ marginTop: 16, paddingTop: 10, borderTopWidth: 0.75, borderTopColor: INK }}><Text>{t.notice} {t.noticeEnd}</Text></View>
      </View>
    </Page>
  </Document>;
}

/** A robot picture as a JPEG, because the PDF library cannot read WebP. A picture that fails is just left out. */
async function photo(src: string, origin: string): Promise<string | null> {
  try {
    const response = await fetch(origin + src, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer())).flatten({ background: '#ffffff' }).resize(1400, 900, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer();
    return 'data:image/jpeg;base64,' + jpeg.toString('base64');
  } catch (error) {
    console.error('report picture failed', src, error);
    return null;
  }
}

export async function reportPdf(data: ReportData, siteUrl: string, origin: string) {
  const pictures = await Promise.all(data.options.map(async (option) => [option.id, option.image ? await photo(option.image, origin) : null] as const));
  const photos = Object.fromEntries(pictures.filter((entry): entry is readonly [string, string] => entry[1] !== null));
  return renderToBuffer(<Report data={data} siteUrl={siteUrl} photos={photos} />);
}
