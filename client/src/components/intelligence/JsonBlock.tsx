export default function JsonBlock({
  data,
  title,
  maxHeight = 'max-h-96',
}: {
  data: unknown;
  title?: string;
  maxHeight?: string;
}) {
  if (data == null) return null;
  return (
    <div className="card">
      {title && (
        <h4 className="text-sm font-semibold text-slate-200 mb-3">{title}</h4>
      )}
      <pre
        className={`overflow-auto rounded-lg bg-slate-950/50 border border-app-border p-3 text-xs text-slate-300 ${maxHeight}`}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
