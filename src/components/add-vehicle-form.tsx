'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVehicleSchema } from '@/lib/validators';

interface FormErrors {
  name?: string;
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  odometer?: string;
  photoUrl?: string;
}

export function AddVehicleForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [odometer, setOdometer] = useState('0');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const result = createVehicleSchema.safeParse({
      name: name.trim(),
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || 0,
      vin: vin.trim(),
      licensePlate: licensePlate.trim(),
      color: color.trim(),
      odometer: parseInt(odometer, 10) || 0,
    });

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors = result.error.flatten().fieldErrors;
    setErrors({
      name: fieldErrors.name?.[0] ? 'Vehicle name is required' : undefined,
      make: fieldErrors.make?.[0] ? 'Make is required' : undefined,
      model: fieldErrors.model?.[0] ? 'Model is required' : undefined,
      year: fieldErrors.year?.[0] ? 'Valid year is required' : undefined,
      vin: fieldErrors.vin?.[0] ? 'VIN must be 17 characters (A-Z, 0-9, no I/O/Q)' : undefined,
      licensePlate: fieldErrors.licensePlate?.[0] ? 'License plate is required' : undefined,
      odometer: fieldErrors.odometer?.[0] ? 'Odometer must be 0 or more' : undefined,
    });
    return false;
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return null;

    const formData = new FormData();
    formData.append('file', photoFile);

    const res = await fetch('/api/uploads', { method: 'POST', body: formData });
    if (!res.ok) return null;

    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      const photoUrl = await uploadPhoto();

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year, 10),
          vin: vin.trim() || undefined,
          licensePlate: licensePlate.trim(),
          color: color.trim() || undefined,
          odometer: parseInt(odometer, 10) || 0,
          photoUrl: photoUrl || undefined,
        }),
      });

      if (!res.ok) {
        setServerError('Failed to create vehicle. Please try again.');
        return;
      }

      router.push('/vehicles');
      router.refresh();
    } catch {
      setServerError('Failed to create vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-fleet-sidebar focus:outline-none focus:ring-1 focus:ring-fleet-sidebar';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      {serverError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>Vehicle Name</label>
        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. Van 1" />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="make" className={labelClass}>Make</label>
          <input id="make" type="text" value={make} onChange={e => setMake(e.target.value)} className={inputClass} placeholder="e.g. Ford" />
          {errors.make && <p className={errorClass}>{errors.make}</p>}
        </div>
        <div>
          <label htmlFor="model" className={labelClass}>Model</label>
          <input id="model" type="text" value={model} onChange={e => setModel(e.target.value)} className={inputClass} placeholder="e.g. Transit" />
          {errors.model && <p className={errorClass}>{errors.model}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="year" className={labelClass}>Year</label>
          <input id="year" type="number" value={year} onChange={e => setYear(e.target.value)} className={inputClass} min={1900} max={new Date().getFullYear() + 2} />
          {errors.year && <p className={errorClass}>{errors.year}</p>}
        </div>
        <div>
          <label htmlFor="color" className={labelClass}>Color</label>
          <input id="color" type="text" value={color} onChange={e => setColor(e.target.value)} className={inputClass} placeholder="e.g. White" />
        </div>
      </div>

      <div>
        <label htmlFor="licensePlate" className={labelClass}>License Plate</label>
        <input id="licensePlate" type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} className={inputClass} placeholder="e.g. AB12 CDE" />
        {errors.licensePlate && <p className={errorClass}>{errors.licensePlate}</p>}
      </div>

      <div>
        <label htmlFor="vin" className={labelClass}>VIN</label>
        <input id="vin" type="text" value={vin} onChange={e => setVin(e.target.value)} className={inputClass} placeholder="17-character VIN (optional)" maxLength={17} />
        {errors.vin && <p className={errorClass}>{errors.vin}</p>}
      </div>

      <div>
        <label htmlFor="odometer" className={labelClass}>Odometer (km)</label>
        <input id="odometer" type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className={inputClass} min={0} />
        {errors.odometer && <p className={errorClass}>{errors.odometer}</p>}
      </div>

      <div>
        <label htmlFor="photo" className={labelClass}>Photo</label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handlePhotoChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-fleet-sidebar file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-fleet-sidebar-hover"
        />
        {photoPreview && (
          <img src={photoPreview} alt="Vehicle photo preview" className="mt-2 h-32 w-32 rounded-lg object-cover" />
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-fleet-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-fleet-sidebar-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Add Vehicle'}
        </button>
        <Link href="/vehicles" className="text-sm text-slate-600 hover:text-slate-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
