-- Remove deprecated Server R-Check artifacts
drop function if exists public.get_server_room_daily_checks();

drop table if exists public.server_room_daily_metadata cascade;
drop table if exists public.server_room_environment_readings cascade;
drop table if exists public.server_room_daily_checks cascade;
