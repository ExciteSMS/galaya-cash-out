CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_qty = GREATEST(0, stock_qty - p_qty),
      updated_at = now()
  WHERE id = p_product_id
    AND merchant_id = (SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, int) TO service_role;