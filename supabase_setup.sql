
-- Supabase Schema Setup for Rajwadi

-- 1. Create Products Table
CREATE TABLE public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    rating NUMERIC(2, 1),
    reviews INTEGER,
    image TEXT,
    color TEXT,
    fabric TEXT,
    description TEXT,
    stitching_options JSONB,
    in_stock BOOLEAN DEFAULT true,
    tags JSONB,
    badge TEXT,
    badge_color TEXT
);

-- 2. Create Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    order_number TEXT NOT NULL,
    total_payable NUMERIC(10, 2) NOT NULL,
    items JSONB NOT NULL,
    status TEXT DEFAULT 'Processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Set up Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products are readable by everyone, but only editable by admins (we'll just allow read for now)
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- Orders are only viewable and insertable by the user who owns them
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- 4. Insert Initial Product Data
INSERT INTO public.products (id, name, category, price, rating, reviews, image, color, fabric, description, stitching_options, in_stock, tags, badge, badge_color) VALUES
('prod-lehenga-01', 'Royal Crimson & Gold Bridal Lehenga Choli', 'Lehenga', 349, 4.9, 42, 'assets/images/lehenga.png', 'Red', 'Velvet', 'A spectacular royal red bridal lehenga crafted in premium velvet, adorned with heavy zari, stones, and dabka hand embroidery. Complete with a matching embroidered blouse and a sheer net dupatta.', '["unstitched","standard","custom"]'::jsonb, true, '["Bridal","Wedding","Best Seller"]'::jsonb, NULL, NULL),
('prod-saree-01', 'Magnificent Ruby Banarasi Silk Saree', 'Saree', 189, 4.8, 29, 'assets/images/saree.png', 'Red', 'Silk', 'An exquisite Banarasi silk saree woven with genuine gold zari thread work. Features a rich pallu and a classic border. Includes a matching unstitched silk blouse piece.', '["unstitched","standard","custom"]'::jsonb, true, '["Traditional","Festive","New Arrival"]'::jsonb, NULL, NULL),
('prod-sherwani-01', 'Maharaja Cream Embroidered Sherwani Set', 'Sherwani', 399, 4.9, 35, 'assets/images/sherwani.png', 'Cream', 'Brocade', 'Make a grand entrance in this imperial cream sherwani tailored in raw silk brocade. Adorned with delicate sequence work, tilla embroidery, paired with a royal maroon churidar and pocket square.', '["standard","custom"]'::jsonb, true, '["Grooms Wear","Wedding","Royal"]'::jsonb, NULL, NULL),
('prod-salwar-01', 'Emerald Grace Designer Anarkali Suit', 'Salwar Kameez', 149, 4.7, 18, 'assets/images/salwar.png', 'Green', 'Georgette', 'A classic floor-length emerald green Anarkali suit in fine georgette. Highlights include detailed gold thread embroidery on the yoke and a lightweight matching organza dupatta.', '["standard","custom"]'::jsonb, true, '["Designer","Party Wear"]'::jsonb, NULL, NULL),
('prod-saree-02', 'Golden Aura Georgette Lehenga Saree', 'Saree', 219, 4.6, 15, 'assets/images/saree.png', 'Gold', 'Georgette', 'A modern pre-draped lehenga-style saree featuring gold sequin stripes on georgette fabric. Ideal for reception nights and high-profile cocktail parties.', '["unstitched","standard","custom"]'::jsonb, true, '["Fusion","Cocktail"]'::jsonb, NULL, NULL),
('prod-sherwani-02', 'Imperial Emerald Velvet Bandhgala Suit', 'Sherwani', 279, 4.8, 22, 'assets/images/sherwani.png', 'Green', 'Velvet', 'A premium velvet Jodhpuri Bandhgala suit featuring brass buttons and structured shoulder pads. Perfectly blends classic Indian tailoring with a modern silhouette.', '["standard","custom"]'::jsonb, true, '["Jodhpuri","Classic"]'::jsonb, NULL, NULL),
('prod-lehenga-02', 'Mustard Blossom Georgette Lehenga', 'Lehenga', 239, 4.8, 14, 'assets/images/haldi_look.png', 'Gold', 'Georgette', 'A stunning mustard yellow georgette lehenga choli embellished with floral thread and zari embroidery. Paired with a delicate matching dupatta.', '["unstitched","standard","custom"]'::jsonb, true, '["Haldi","Wedding","Festival"]'::jsonb, NULL, NULL),
('prod-lehenga-03', 'Olive Blossom Embroidered Lehenga', 'Lehenga', 259, 4.7, 19, 'assets/images/mehndi_look.png', 'Green', 'Georgette', 'An elegant olive green lehenga choli featuring intricate floral embroidery and sequence work on raw silk and georgette.', '["unstitched","standard","custom"]'::jsonb, true, '["Mehndi","Party Wear","Festival"]'::jsonb, NULL, NULL),
('prod-lehenga-04', 'Royal Heritage Red Bridal Lehenga', 'Lehenga', 379, 4.9, 52, 'assets/images/wedding_look.png', 'Red', 'Silk', 'Celebrate your big day in this majestic red silk bridal lehenga, adorned with royal gold tilla, zari, and stone embroidery.', '["unstitched","standard","custom"]'::jsonb, true, '["Bridal","Wedding","Royal"]'::jsonb, NULL, NULL),
('prod-lehenga-05', 'Teal Sequins Dazzling Lehenga', 'Lehenga', 289, 4.9, 26, 'assets/images/sangeet_look.png', 'Blue', 'Georgette', 'Turn heads at your Sangeet night in this dazzling teal blue georgette lehenga choli, fully embellished with silver sequins and beadwork.', '["unstitched","standard","custom"]'::jsonb, true, '["Sangeet","Party Wear","Sequins"]'::jsonb, NULL, NULL),
('prod-saree-03', 'Imperial Plum Kanjivaram Silk Saree', 'Saree', 199, 4.9, 32, 'assets/images/saree_plum.jpg', 'Red', 'Silk', 'A royal plum-colored Kanjivaram silk saree featuring a rich gold zari woven border and elegant paisley motifs on the pallu.', '["unstitched","standard","custom"]'::jsonb, true, '["Kanjivaram","Silk","Traditional"]'::jsonb, NULL, NULL),
('prod-saree-04', 'Fuchsia Grid Katan Silk Saree', 'Saree', 179, 4.8, 21, 'assets/images/saree_magenta.jpg', 'Red', 'Silk', 'Drape yourself in elegance with this fuchsia pink Katan silk saree, styled with a checks layout filled with detailed gold zari creepers.', '["unstitched","standard","custom"]'::jsonb, true, '["Katan Silk","Festive","Elegant"]'::jsonb, NULL, NULL),
('prod-saree-05', 'Scarlet Temple Border Silk Saree', 'Saree', 169, 4.9, 44, 'assets/images/saree_crimson.jpg', 'Red', 'Silk', 'A classic scarlet red silk saree featuring circular gold zari buttas and a green selvedge running along the traditional temple gold border.', '["unstitched","standard","custom"]'::jsonb, true, '["Bridal","Traditional","Temple Border"]'::jsonb, NULL, NULL),
('prod-sherwani-03', 'Imperial Navy Blue Velvet Sherwani', 'Sherwani', 359, 4.9, 18, 'assets/images/sherwani_navy.jpg', 'Blue', 'Velvet', 'A luxurious navy blue velvet sherwani decorated with silver zari work, detailed bead embroidery, paired with ivory dhoti pants and a matching safa turban.', '["standard","custom"]'::jsonb, true, '["Grooms Wear","Velvet","Royal"]'::jsonb, NULL, NULL),
('prod-sherwani-04', 'Regal Silver Embroidered Sherwani', 'Sherwani', 329, 4.8, 12, 'assets/images/sherwani_silver.jpg', 'Cream', 'Brocade', 'Exquisite silver and cream designer sherwani featuring all-over floral thread embroidery and mirror details, perfect for wedding receptions.', '["standard","custom"]'::jsonb, true, '["Designer","Wedding","Silver Work"]'::jsonb, NULL, NULL),
('prod-sherwani-05', 'Royal Cream & Pink Indowestern Set', 'Sherwani', 379, 4.9, 24, 'assets/images/sherwani_indowestern.jpg', 'Cream', 'Silk', 'An elegant indowestern groom sherwani featuring a cream silk jacket, a layered bottom skirt, and a soft pink georgette dupatta drape with gold borders.', '["standard","custom"]'::jsonb, true, '["Indowestern","Wedding","Royal"]'::jsonb, NULL, NULL),
('prod-salwar-02', 'Indigo Floral Anarkali Suit', 'Salwar Kameez', 139, 4.8, 15, 'assets/images/salwar_blue_anarkali.jpg', 'Blue', 'Georgette', 'A beautiful indigo blue georgette Anarkali suit featuring traditional floral prints, a matching dupatta, and comfortable bottom pants.', '["standard","custom"]'::jsonb, true, '["Anarkali","Festive","Designer"]'::jsonb, NULL, NULL),
('prod-salwar-03', 'Imperial Plum Straight Suit', 'Salwar Kameez', 159, 4.9, 29, 'assets/images/salwar_plum_kurta.jpg', 'Red', 'Silk', 'A sleek straight-cut plum maroon silk kurta paired with matching straight pants and a heavy gold zari woven dupatta.', '["standard","custom"]'::jsonb, true, '["Straight Fit","Traditional","Festive"]'::jsonb, NULL, NULL);
