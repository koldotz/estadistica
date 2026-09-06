-- ============================================================
-- Estadística Armairua · esquema de Supabase
-- Pégalo entero en Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Perfiles: identificación por nombre, sin contraseña.
create table if not exists public.perfiles (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  creado_en  timestamptz not null default now()
);

-- Sesiones del calendario marcadas como hechas.
create table if not exists public.progreso (
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  fecha        date not null,
  hecho        boolean not null default true,
  actualizado  timestamptz not null default now(),
  primary key (perfil_id, fecha)
);

-- Respuestas del banco de ejercicios.
create table if not exists public.respuestas (
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  ejercicio    integer not null,
  respuesta    text not null,
  correcta     boolean,
  actualizado  timestamptz not null default now(),
  primary key (perfil_id, ejercicio)
);

-- Notas propias: una por sesión del calendario y una por tema.
create table if not exists public.notas (
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  ambito       text not null check (ambito in ('sesion','tema')),
  clave        text not null,
  texto        text not null default '',
  actualizado  timestamptz not null default now(),
  primary key (perfil_id, ambito, clave)
);

-- Registro de simulacros, con la corrección aciertos - errores/2.
create table if not exists public.simulacros (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  fecha       date not null,
  aciertos    integer not null,
  errores     integer not null,
  blancos     integer not null default 0,
  nota        numeric(6,2) not null,
  comentario  text default '',
  creado_en   timestamptz not null default now()
);

create index if not exists simulacros_perfil_fecha on public.simulacros (perfil_id, fecha);

-- ------------------------------------------------------------
-- Seguridad
-- La app no tiene login real: se identifica por nombre y usa la clave
-- anon, que es pública. Estas políticas permiten leer y escribir a
-- cualquiera que tenga la URL y la clave. Es aceptable para datos de
-- estudio; no guardes aquí nada personal.
-- ------------------------------------------------------------
alter table public.perfiles   enable row level security;
alter table public.progreso   enable row level security;
alter table public.respuestas enable row level security;
alter table public.notas      enable row level security;
alter table public.simulacros enable row level security;

do $$
declare t text;
begin
  foreach t in array array['perfiles','progreso','respuestas','notas','simulacros'] loop
    execute format('drop policy if exists %I on public.%I', t || '_anon', t);
    execute format(
      'create policy %I on public.%I for all to anon using (true) with check (true)',
      t || '_anon', t);
  end loop;
end $$;
