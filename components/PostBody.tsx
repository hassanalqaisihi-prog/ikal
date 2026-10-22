// Plain text plus ``` code blocks. React escapes everything, so no HTML can be injected.
export default function PostBody({ text }: { text: string }) {
  const parts = text.split('```');
  return (
    <div className="space-y-3 leading-8">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <pre key={i} dir="ltr" className="overflow-x-auto rounded-xl border border-white/10 bg-void p-3 text-sm text-nebula">
            <code>{p.replace(/^[a-zA-Z0-9+#-]*\n/, '').replace(/\n$/, '')}</code>
          </pre>
        ) : p.trim() ? (
          <p key={i} dir="auto" className="whitespace-pre-wrap break-words">{p.trim()}</p>
        ) : null
      )}
    </div>
  );
}
