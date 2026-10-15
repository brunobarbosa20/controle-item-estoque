create table if not exists public.itens_estoque (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (length(trim(descricao)) between 1 and 120),
  created_at timestamptz not null default now()
);

create unique index if not exists itens_estoque_descricao_unica_idx
  on public.itens_estoque (lower(trim(descricao)));

insert into public.itens_estoque (descricao)
values ('Saco a granel')
on conflict do nothing;

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens_estoque(id),
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  setor text,
  nome text not null check (length(trim(nome)) > 0),
  data_movimento date not null,
  created_at timestamptz not null default now(),
  constraint setor_obrigatorio_na_saida check (tipo <> 'saida' or length(trim(coalesce(setor, ''))) > 0)
);

alter table public.movimentacoes_estoque
  add column if not exists item_id uuid references public.itens_estoque(id);

update public.movimentacoes_estoque
set item_id = (select id from public.itens_estoque where lower(trim(descricao)) = lower('Saco a granel') limit 1)
where item_id is null;

alter table public.movimentacoes_estoque
  alter column item_id set not null;

create index if not exists movimentacoes_estoque_item_data_idx
  on public.movimentacoes_estoque (item_id, data_movimento desc, created_at desc);

alter table public.itens_estoque enable row level security;
revoke all on table public.itens_estoque from anon, authenticated;
grant select on table public.itens_estoque to anon, authenticated;

drop policy if exists "Itens visiveis para todos" on public.itens_estoque;
create policy "Itens visiveis para todos"
  on public.itens_estoque
  for select
  to anon, authenticated
  using (true);

alter table public.movimentacoes_estoque enable row level security;
revoke all on table public.movimentacoes_estoque from anon, authenticated;
grant select on table public.movimentacoes_estoque to anon, authenticated;

drop policy if exists "Movimentacoes visiveis para todos" on public.movimentacoes_estoque;
create policy "Movimentacoes visiveis para todos"
  on public.movimentacoes_estoque
  for select
  to anon, authenticated
  using (true);

drop function if exists public.resumo_estoque();
create function public.resumo_estoque()
returns table (item_id uuid, descricao text, total_entradas bigint, total_saidas bigint, saldo_atual bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    i.descricao,
    coalesce(sum(m.quantidade) filter (where m.tipo = 'entrada'), 0)::bigint,
    coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)::bigint,
    coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0)::bigint
  from public.itens_estoque i
  left join public.movimentacoes_estoque m on m.item_id = i.id
  group by i.id, i.descricao
  order by i.descricao;
$$;

drop function if exists public.registrar_movimentacao(text, integer, text, text, date);
create function public.registrar_movimentacao(
  p_item_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_setor text,
  p_nome text,
  p_data date
)
returns public.movimentacoes_estoque
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo bigint;
  v_movimentacao public.movimentacoes_estoque;
begin
  if p_item_id is null or not exists (select 1 from public.itens_estoque where id = p_item_id) then
    raise exception 'Selecione um item cadastrado.';
  end if;
  if p_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentacao invalido.';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser um numero inteiro maior que zero.';
  end if;
  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Informe o nome de quem esta registrando.';
  end if;
  if p_data is null then
    raise exception 'Informe a data da movimentacao.';
  end if;
  if p_tipo = 'saida' and (p_setor is null or length(trim(p_setor)) = 0) then
    raise exception 'Informe o setor que recebera os pacotes.';
  end if;

  perform pg_advisory_xact_lock(78451237);

  if p_tipo = 'saida' then
    select coalesce(sum(case when tipo = 'entrada' then quantidade else -quantidade end), 0)
      into v_saldo
      from public.movimentacoes_estoque
      where item_id = p_item_id;
    if v_saldo < p_quantidade then
      raise exception 'Saldo insuficiente. Disponivel para este item: % pacotes.', v_saldo;
    end if;
  end if;

  insert into public.movimentacoes_estoque (item_id, tipo, quantidade, setor, nome, data_movimento)
    values (p_item_id, p_tipo, p_quantidade, nullif(trim(p_setor), ''), trim(p_nome), p_data)
    returning * into v_movimentacao;
  return v_movimentacao;
end;
$$;

create or replace function public.criar_item(p_descricao text)
returns public.itens_estoque
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.itens_estoque;
begin
  if p_descricao is null or length(trim(p_descricao)) not between 1 and 120 then
    raise exception 'A descricao do item deve ter entre 1 e 120 caracteres.';
  end if;

  insert into public.itens_estoque (descricao)
    values (trim(p_descricao))
    returning * into v_item;
  return v_item;
exception
  when unique_violation then
    raise exception 'Ja existe um item com essa descricao.';
end;
$$;

revoke all on function public.resumo_estoque() from public;
revoke all on function public.registrar_movimentacao(uuid, text, integer, text, text, date) from public;
revoke all on function public.criar_item(text) from public;
grant execute on function public.resumo_estoque() to anon, authenticated;
grant execute on function public.registrar_movimentacao(uuid, text, integer, text, text, date) to anon, authenticated;
grant execute on function public.criar_item(text) to anon, authenticated;
