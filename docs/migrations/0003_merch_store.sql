-- Add an admin-managed physical merch catalog and fulfillment details to purchases.
CREATE TABLE IF NOT EXISTS merch_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  category varchar(30) NOT NULL,
  image_url text NOT NULL,
  gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  available_sizes jsonb NOT NULL DEFAULT '["One size"]'::jsonb,
  price_usd numeric(10,2) NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS merch_product_id uuid REFERENCES merch_products(id) ON DELETE RESTRICT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS merch_size varchar(40);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shipping_name varchar(160);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shipping_phone varchar(40);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS fulfillment_status varchar(30) NOT NULL DEFAULT 'not_applicable';
