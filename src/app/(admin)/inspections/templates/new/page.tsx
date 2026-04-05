import Link from 'next/link';
import { TemplateEditor } from '@/components/template-editor';

export default function NewTemplatePage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/inspections" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
          ← Templates
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">New inspection template</h1>
      </div>
      <TemplateEditor />
    </div>
  );
}
