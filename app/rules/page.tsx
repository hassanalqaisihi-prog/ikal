import { getLang } from '@/lib/i18n';

// Starter community rules: edit freely.
export default function RulesPage() {
  const lang = getLang();
  if (lang === 'en') {
    return (
      <article className="card mx-auto max-w-2xl space-y-3 leading-8">
        <h1 className="text-2xl font-bold">Community rules</h1>
        <ol className="list-decimal space-y-2 ps-6">
          <li>Be kind. Disagree with ideas, never attack people.</li>
          <li>Ask one clear question at a time, with enough detail to be answered.</li>
          <li>Search before you ask. Do not post the same question twice.</li>
          <li>Answers should help. Explain, do not just paste.</li>
          <li>No spam, ads, hate, threats, or private information about others.</li>
          <li>Mark the answer that solved your problem as accepted.</li>
          <li>Use the report link on anything that breaks these rules.</li>
        </ol>
      </article>
    );
  }
  return (
    <article className="card mx-auto max-w-2xl space-y-3 leading-8">
      <h1 className="text-2xl font-bold">قواعد المجتمع</h1>
      <ol className="list-decimal space-y-2 ps-6">
        <li>كن لطيفاً. اختلف مع الأفكار، ولا تهاجم الأشخاص أبداً.</li>
        <li>اسأل سؤالاً واحداً واضحاً، وبتفاصيل كافية حتى يمكن الجواب عليه.</li>
        <li>ابحث قبل أن تسأل، ولا تكرر السؤال نفسه.</li>
        <li>الجواب يجب أن يفيد. اشرح، ولا تكتفِ باللصق.</li>
        <li>ممنوع الإعلانات والسبام والكراهية والتهديد ونشر معلومات خاصة عن الآخرين.</li>
        <li>اختر الجواب الذي حلّ مشكلتك كجواب مقبول.</li>
        <li>استخدم رابط الإبلاغ على أي شيء يخالف هذه القواعد.</li>
      </ol>
    </article>
  );
}
