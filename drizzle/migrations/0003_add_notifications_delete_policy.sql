create policy "Merchants can delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using (merchant_id = get_merchant_id());