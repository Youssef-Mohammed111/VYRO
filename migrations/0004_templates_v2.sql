-- New industry templates: classic restaurant, supermarket, real estate.
insert into templates (id, slug, name_en, name_ar, industry, family, status, version, layout_json, theme_json, allowed_modules)
select 'tmpl_restaurant', 'restaurant-classic', 'Restaurant Classic', 'مطعم كلاسيك', 'restaurant', 'restaurant', 'active', 1, '{}', '{}', allowed_modules
from templates where id = 'tmpl_rpm'
on conflict (id) do nothing;

insert into templates (id, slug, name_en, name_ar, industry, family, status, version, layout_json, theme_json, allowed_modules)
select 'tmpl_supermarket', 'supermarket-fresh', 'Supermarket Fresh', 'سوبر ماركت', 'retail', 'supermarket', 'active', 1, '{}', '{}', allowed_modules
from templates where id = 'tmpl_rpm'
on conflict (id) do nothing;

insert into templates (id, slug, name_en, name_ar, industry, family, status, version, layout_json, theme_json, allowed_modules)
select 'tmpl_realestate', 'real-estate', 'Real Estate', 'عقارات', 'realestate', 'realestate', 'active', 1, '{}', '{}', allowed_modules
from templates where id = 'tmpl_rpm'
on conflict (id) do nothing;
