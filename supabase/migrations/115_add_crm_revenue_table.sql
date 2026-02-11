
-- Create crm_revenue table
create table if not exists crm_revenue (
  id uuid default gen_random_uuid() primary key,
  opportunity_id uuid references crm_opportunities(id) on delete cascade not null,
  amount numeric not null default 0,
  payment_date date not null default current_date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references profiles(id)
);

-- RLS Policies
alter table crm_revenue enable row level security;

create policy "Users can view revenue of their organization"
  on crm_revenue for select
  using (true);

create policy "Users can insert revenue"
  on crm_revenue for insert
  with check (true);

create policy "Users can update revenue"
  on crm_revenue for update
  using (true);

create policy "Users can delete revenue"
  on crm_revenue for delete
  using (true);

-- Indexes for performance
create index idx_crm_revenue_opportunity_id on crm_revenue(opportunity_id);
create index idx_crm_revenue_payment_date on crm_revenue(payment_date);
