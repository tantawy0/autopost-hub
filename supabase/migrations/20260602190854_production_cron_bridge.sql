create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function private.invoke_autopost_endpoint(endpoint_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url text;
  cron_secret text;
begin
  if endpoint_path not in ('/api/cron/scheduler', '/api/cron/worker') then
    raise exception 'Unsupported AutoPost cron endpoint.';
  end if;

  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'autopost_app_url'
  limit 1;

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'autopost_cron_secret'
  limit 1;

  if app_url is null or cron_secret is null then
    raise exception 'AutoPost cron Vault secrets are not configured.';
  end if;

  return net.http_get(
    url := app_url || endpoint_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function private.invoke_autopost_endpoint(text) from public, anon, authenticated;

create or replace function public.configure_autopost_cron(
  target_app_url text,
  target_cron_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url_secret_id uuid;
  cron_secret_id uuid;
begin
  if target_app_url !~ '^https://[a-zA-Z0-9.-]+(?::[0-9]+)?$' then
    raise exception 'AutoPost app URL must be an HTTPS origin without a path.';
  end if;

  if length(target_cron_secret) < 32 then
    raise exception 'AutoPost cron secret must be at least 32 characters.';
  end if;

  select id
  into app_url_secret_id
  from vault.decrypted_secrets
  where name = 'autopost_app_url'
  limit 1;

  if app_url_secret_id is null then
    perform vault.create_secret(
      target_app_url,
      'autopost_app_url',
      'Production AutoPost Hub origin used by Supabase Cron.'
    );
  else
    perform vault.update_secret(app_url_secret_id, target_app_url);
  end if;

  select id
  into cron_secret_id
  from vault.decrypted_secrets
  where name = 'autopost_cron_secret'
  limit 1;

  if cron_secret_id is null then
    perform vault.create_secret(
      target_cron_secret,
      'autopost_cron_secret',
      'Bearer secret used by Supabase Cron for AutoPost Hub.'
    );
  else
    perform vault.update_secret(cron_secret_id, target_cron_secret);
  end if;

  perform cron.schedule(
    'autopost-scheduler-minute',
    '* * * * *',
    $cron$select private.invoke_autopost_endpoint('/api/cron/scheduler');$cron$
  );

  perform cron.schedule(
    'autopost-worker-minute',
    '* * * * *',
    $cron$select private.invoke_autopost_endpoint('/api/cron/worker');$cron$
  );
end;
$$;

revoke all on function public.configure_autopost_cron(text, text) from public, anon, authenticated;
grant execute on function public.configure_autopost_cron(text, text) to service_role;
