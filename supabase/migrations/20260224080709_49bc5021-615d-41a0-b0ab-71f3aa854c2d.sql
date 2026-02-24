
-- Allow authenticated users to insert their own merchant profile
CREATE POLICY "Users can create own merchant profile"
  ON public.merchants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
