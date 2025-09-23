-- Migrate legacy computer specification keys to the new structure.
-- This preserves existing values while mapping them to the new field names
-- introduced in the application (cpuSeries, ramGb, operatingSystem) and
-- reusing existing storage information for the Harddisk field when possible.

update equipment
set specs = jsonb_strip_nulls(
    coalesce(specs, '{}'::jsonb)
      || case
           when specs ? 'cpuSeries' then jsonb_build_object('cpuSeries', specs ->> 'cpuSeries')
           else '{}'::jsonb
         end
      || case
           when specs ? 'ram' then jsonb_build_object('ramGb', specs ->> 'ram')
           else '{}'::jsonb
         end
      || case
           when specs ? 'storage' and (specs ? 'harddisk') is not true then jsonb_build_object('harddisk', specs ->> 'storage')
           else '{}'::jsonb
         end
      || case
           when specs ? 'os' then jsonb_build_object('operatingSystem', specs ->> 'os')
           else '{}'::jsonb
         end
  ) - 'ram' - 'storage' - 'os'
where specs ? 'ram'
   or specs ? 'storage'
   or specs ? 'os';
