/** Render text with @mentions highlighted */
export default function MentionText({ text }: { text: string }) {
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
  const re = /@([\w.\-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', value: text.slice(last, m.index) });
    }
    parts.push({ type: 'mention', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.type === 'mention' ? (
          <span
            key={i}
            className="text-cyan-400 font-medium bg-cyan-500/10 rounded px-0.5"
          >
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
