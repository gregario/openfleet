import { supabase } from '@/lib/db';
import { SettingsEditor } from '@/components/settings-editor';
import { ServiceTypesEditor } from '@/components/service-types-editor';

interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

interface ServiceTypeRow {
  id: string;
  name: string;
  is_default: boolean;
}

export default async function SettingsPage() {
  const [{ data: settingsData }, { data: typesData }] = await Promise.all([
    supabase.from('settings').select('key,value,updated_at').order('key', { ascending: true }),
    supabase
      .from('service_types')
      .select('id,name,is_default')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
  ]);

  const settings = (settingsData ?? []) as SettingRow[];
  const serviceTypes = (typesData ?? []) as ServiceTypeRow[];

  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Company-wide OpenFleet configuration.
        </p>
      </div>

      <SettingsEditor
        companyName={(byKey.company_name as string) ?? ''}
        companyTimezone={(byKey.company_timezone as string) ?? 'Europe/London'}
        dataRetentionDays={(byKey.data_retention_days as number) ?? 365}
        trackingSchedule={
          (byKey.tracking_schedule as {
            enabled?: boolean;
            start?: string;
            end?: string;
            days?: string[];
          }) ?? { enabled: true, start: '07:00', end: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
        }
      />

      <ServiceTypesEditor initialTypes={serviceTypes} />
    </div>
  );
}
