-- Adds Mouse and Keyboard to ink_material_type so Maintenance/Stock can track these items
alter type public.ink_material_type add value if not exists 'mouse';
alter type public.ink_material_type add value if not exists 'keyboard';
