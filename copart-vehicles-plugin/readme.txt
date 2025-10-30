=== Copart Vehicles Display ===
Contributors: Ernestas
Tags: vehicles, copart, auction, cars, shortcode
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.1.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display Copart vehicles using shortcode [copart_vehicles]. Shows vehicles from your deployed scraper API.

== Description ==

The Copart Vehicles Display plugin allows you to easily display vehicles from your Copart scraper API on any WordPress page or post using a simple shortcode.

**Features:**

* Simple shortcode implementation: `[copart_vehicles]`
* Multiple display layouts: Grid, List, and Table
* Advanced filtering and sorting options
* Responsive design that works on all devices
* Caching for improved performance
* Admin settings page for easy configuration
* Real-time data from your deployed scraper API

**Shortcode Parameters:**

* `limit` - Number of vehicles to display (default: 20)
* `show_images` - Show vehicle images (true/false)
* `show_bids` - Show bid information (true/false)
* `show_odometer` - Show odometer reading (true/false)
* `show_location` - Show vehicle location (true/false)
* `layout` - Display layout (grid/list/table)
* `sort_by` - Sort order (latest/bid_high/bid_low/odometer_low/odometer_high)
* `filter_location` - Filter by location
* `min_bid` - Minimum bid amount
* `max_bid` - Maximum bid amount

**Examples:**

* `[copart_vehicles limit="10" layout="list"]` - Show 10 vehicles in list format
* `[copart_vehicles sort_by="bid_high" min_bid="1000"]` - Show highest bids over $1000
* `[copart_vehicles filter_location="CA" show_images="false"]` - California vehicles without images

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/copart-vehicles-plugin` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to Settings > Copart Vehicles to configure your API URL
4. Use the `[copart_vehicles]` shortcode on any page or post

== Frequently Asked Questions ==

= How do I configure the API URL? =

Go to Settings > Copart Vehicles in your WordPress admin and enter your API URL (default: http://96.30.192.167:3000).

= Can I customize the appearance? =

Yes! The plugin includes CSS classes that you can override in your theme's style.css file.

= How often is the data refreshed? =

The plugin caches data for 5 minutes by default. You can change this in the settings or use the refresh button on the frontend.

= Does it work with page builders? =

Yes! The shortcode works with any page builder that supports shortcodes, including Gutenberg, Elementor, and others.

== Screenshots ==

1. Vehicle display in grid layout
2. Vehicle display in list layout
3. Admin settings page
4. Mobile responsive design

== Changelog ==

= 1.1.6 =
* Full Lithuanian language translation
* Translated all filters, labels, and buttons to Lithuanian
* Changed "Automobile" to "Gamintojas"
* Changed "See more/See less" to "Rodyti daugiau/Rodyti mažiau"
* Changed "Filters" to "Filtrai"
* Changed "Estimated price" to "Įvertinta kaina"
* Changed "Year" to "Metai"
* Changed "Odometer" to "Rida" (changed unit from "mi" to "km")
* Translated vehicle info labels (Rida, Vieta, Pirkite dabar, Loto Nr., Atnaujinta)
* Changed "View Auction" to "Peržiūrėti aukcioną"
* Updated date format to Lithuanian standard (Y-m-d H:i)

= 1.1.5 =
* Removed "Start code" filter from sidebar
* Cleaner filter interface with only essential filters
* Removed unnecessary JavaScript handlers

= 1.1.4 =
* Removed "Auction Type" filter from sidebar
* Fixed JavaScript errors in "Start code" input field
* Improved error handling for input field interactions
* Better brand filtering with comprehensive make detection

= 1.1.3 =
* Fixed "See more" functionality in brand selection
* Added 50+ additional car brands (Cadillac, Ford, Tesla, etc.)
* Interactive expand/collapse for brand filters
* Smooth fade animations for better UX

= 1.1.2 =
* Fixed date overlap issue with heart icon spacing
* Re-added filters sidebar on the left side
* Improved responsive design for mobile devices
* Better layout with two-column design (filters + content)

= 1.1.1 =
* Removed "COPART_SCRAPER" source badge from vehicle cards
* Added CSS rules to hide chat elements and widgets
* Cleaner vehicle card appearance with only heart icon

= 1.1.0 =
* Updated to use only real database fields (no fake data)
* Improved single-column list layout design
* Better responsive design for mobile devices
* Cleaner vehicle card display
* Removed fake vehicle specs and status information
* Enhanced data accuracy and reliability

= 1.0.0 =
* Initial release
* Shortcode functionality
* Multiple layouts (grid, list, table)
* Filtering and sorting
* Admin settings page
* Responsive design
* Caching system

== Upgrade Notice ==

= 1.1.1 =
Minor update: Removed source badge and added chat element hiding for cleaner appearance.

= 1.1.0 =
Major update: Now displays only real database fields for improved accuracy and reliability.

= 1.0.0 =
Initial release of the Copart Vehicles Display plugin.
