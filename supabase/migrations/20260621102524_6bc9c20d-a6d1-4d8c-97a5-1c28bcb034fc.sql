
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'in',
  quantity NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  reference TEXT,
  balance_after NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_mov_user ON public.stock_movements(user_id);
CREATE INDEX idx_stock_mov_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_mov_created ON public.stock_movements(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stock movements" ON public.stock_movements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock NUMERIC;
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE public.products SET stock = stock + NEW.quantity, updated_at = now()
      WHERE id = NEW.product_id AND user_id = NEW.user_id
      RETURNING stock INTO new_stock;
  ELSIF NEW.type = 'out' THEN
    UPDATE public.products SET stock = stock - NEW.quantity, updated_at = now()
      WHERE id = NEW.product_id AND user_id = NEW.user_id
      RETURNING stock INTO new_stock;
  ELSE
    UPDATE public.products SET stock = NEW.quantity, updated_at = now()
      WHERE id = NEW.product_id AND user_id = NEW.user_id
      RETURNING stock INTO new_stock;
  END IF;
  NEW.balance_after := new_stock;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_apply_stock_movement BEFORE INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();
