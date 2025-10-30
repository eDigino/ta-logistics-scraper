<?php
/**
 * Copart Shortcode Handler Class
 *
 * @package CopartVehicles
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Copart_Shortcode {
    
    private $api;
    
    public function __construct() {
        $this->api = new Copart_API();
        
        // Register shortcode
        add_shortcode('copart_vehicles', array($this, 'handle_shortcode'));
    }
    
    /**
     * Handle the shortcode
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    public function handle_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 20,
            'show_images' => 'true',
            'show_bids' => 'true',
            'show_odometer' => 'true',
            'show_location' => 'true',
            'layout' => 'grid', // grid, list, table
            'sort_by' => 'scrapedAt', // scrapedAt, currentBidNumeric, odometerNumeric
            'sort_order' => 'desc', // asc, desc
            'filter_location' => '',
            'min_bid' => '',
            'max_bid' => '',
            'min_odometer' => '',
            'max_odometer' => '',
            'search' => '',
            'cache_duration' => get_option('copart_cache_duration', 300)
        ), $atts);
        
        // Get current page from URL
        $current_page = isset($_GET['copart_page']) ? intval($_GET['copart_page']) : 1;
        $current_page = max(1, $current_page);
        
        // Get filter parameters from URL
        $url_filters = array(
            'search' => isset($_GET['search']) ? sanitize_text_field($_GET['search']) : $atts['search'],
            'filter_location' => isset($_GET['location']) ? sanitize_text_field($_GET['location']) : $atts['filter_location'],
            'min_bid' => isset($_GET['min_bid']) ? floatval($_GET['min_bid']) : $atts['min_bid'],
            'max_bid' => isset($_GET['max_bid']) ? floatval($_GET['max_bid']) : $atts['max_bid'],
            'min_odometer' => isset($_GET['min_odometer']) ? intval($_GET['min_odometer']) : $atts['min_odometer'],
            'max_odometer' => isset($_GET['max_odometer']) ? intval($_GET['max_odometer']) : $atts['max_odometer'],
            'sort_by' => isset($_GET['sort_by']) ? sanitize_text_field($_GET['sort_by']) : $atts['sort_by']
        );
        
        // Merge URL filters with shortcode attributes
        $atts = array_merge($atts, $url_filters);
        
        // Add pagination to API params
        $api_params = $atts;
        $api_params['page'] = $current_page;
        
        // Get vehicles data from API
        $result = $this->api->get_vehicles($api_params);
        
        if (is_wp_error($result)) {
            return '<div class="copart-error">Klaida įkeliant transporto priemones: ' . esc_html($result->get_error_message()) . '</div>';
        }
        
        $vehicles = $result['vehicles'];
        $pagination = $result['pagination'];
        
        // Generate HTML output
        return $this->generate_html($vehicles, $atts, $pagination);
    }
    
    
    /**
     * Generate HTML output
     *
     * @param array $vehicles
     * @param array $atts
     * @param array $pagination
     * @return string
     */
    private function generate_html($vehicles, $atts, $pagination = null) {
        $html = '<div class="copart-vehicles-container" data-ajax-url="' . admin_url('admin-ajax.php') . '">';
        
        // Main layout with filters
        $html .= '<div class="copart-main-layout">';
        
        // Left sidebar - Filters
        $html .= $this->generate_filters_sidebar($atts);
        
        // Right content area
        $html .= '<div class="copart-content-area">';
        
        // Vehicle listings
        $html .= '<div class="copart-vehicles-list" id="copart-vehicles-list">';
        
        if (empty($vehicles)) {
            $html .= '<div class="copart-no-vehicles">Nerasta transporto priemonių, atitinkančių jūsų kriterijus.</div>';
        } else {
            foreach ($vehicles as $vehicle) {
                $html .= $this->generate_vehicle_html($vehicle, $atts);
            }
        }
        
        $html .= '</div>'; // copart-vehicles-list
        
        // Pagination
        if ($pagination && $pagination['pages'] > 1) {
            $html .= $this->generate_pagination($pagination);
        }
        
        $html .= '</div>'; // copart-content-area
        $html .= '</div>'; // copart-main-layout
        $html .= '</div>'; // copart-vehicles-container
        
        // Add JavaScript for AJAX functionality
        $html .= $this->generate_javascript();
        
        return $html;
    }
    
    /**
     * Generate filters sidebar
     *
     * @param array $atts
     * @return string
     */
    private function generate_filters_sidebar($atts) {
        $html = '<div class="copart-filters-sidebar">';
        
        // Search filter
        $html .= '<div class="copart-filter-group">';
        $html .= '<label class="copart-filter-label">Paieška</label>';
        $html .= '<input type="text" class="copart-search-input" placeholder="Ieškoti pagal pavadinimą arba loto numerį..." value="' . esc_attr($atts['search']) . '">';
        $html .= '</div>';
        
        // Location filter
        $html .= '<div class="copart-filter-group">';
        $html .= '<label class="copart-filter-label">Vieta</label>';
        $html .= '<select class="copart-location-select">';
        $html .= '<option value="">Visos vietos</option>';
        
        // Get locations from API
        $locations = $this->api->get_locations();
        if (!is_wp_error($locations)) {
            foreach ($locations as $location) {
                $selected = ($atts['filter_location'] === $location) ? 'selected' : '';
                $html .= '<option value="' . esc_attr($location) . '" ' . $selected . '>' . esc_html($location) . '</option>';
            }
        }
        
        $html .= '</select>';
        $html .= '</div>';
        
        $html .= '<h3>Filtrai</h3>';
        
        // Estimated price filter
        $html .= '<div class="copart-filter-group">';
        $html .= '<label class="copart-filter-label">Įvertinta kaina ($) <span style="float: right; color: #999;">USD</span></label>';
        $html .= '<div class="copart-price-range">';
        $html .= '<input type="range" class="copart-range-slider" min="0" max="100000" value="' . esc_attr($atts['min_bid']) . '" id="price-min">';
        $html .= '<input type="range" class="copart-range-slider" min="0" max="100000" value="' . esc_attr($atts['max_bid'] ?: '100000') . '" id="price-max">';
        $html .= '<div class="copart-range-inputs">';
        $html .= '<input type="number" class="copart-range-input" value="' . esc_attr($atts['min_bid']) . '" id="price-min-input" min="0" max="100000">';
        $html .= '<span>-</span>';
        $html .= '<input type="number" class="copart-range-input" value="' . esc_attr($atts['max_bid'] ?: '100000') . '" id="price-max-input" min="0" max="100000">';
        $html .= '</div>';
        $html .= '</div>';
        $html .= '</div>';
        
        // Odometer filter
        $html .= '<div class="copart-filter-group">';
        $html .= '<label class="copart-filter-label">Rida <span style="float: right; color: #999;">km</span></label>';
        $html .= '<div class="copart-price-range">';
        $html .= '<input type="range" class="copart-range-slider" min="0" max="250000" value="' . esc_attr($atts['min_odometer']) . '" id="odometer-min">';
        $html .= '<input type="range" class="copart-range-slider" min="0" max="250000" value="' . esc_attr($atts['max_odometer'] ?: '250000') . '" id="odometer-max">';
        $html .= '<div class="copart-range-inputs">';
        $html .= '<input type="number" class="copart-range-input" value="' . esc_attr($atts['min_odometer']) . '" id="odometer-min-input" min="0" max="250000">';
        $html .= '<span>-</span>';
        $html .= '<input type="number" class="copart-range-input" value="' . esc_attr($atts['max_odometer'] ?: '250000') . '" id="odometer-max-input" min="0" max="250000">';
        $html .= '</div>';
        $html .= '</div>';
        $html .= '</div>';
        
        // Sort options
        $html .= '<div class="copart-filter-group">';
        $html .= '<label class="copart-filter-label">Rūšiavimas</label>';
        $html .= '<select class="copart-sort-select">';
        $html .= '<option value="scrapedAt" ' . selected($atts['sort_by'], 'scrapedAt', false) . '>Naujausi</option>';
        $html .= '<option value="currentBidNumeric" ' . selected($atts['sort_by'], 'currentBidNumeric', false) . '>Kaina (aukščiausia)</option>';
        $html .= '<option value="odometerNumeric" ' . selected($atts['sort_by'], 'odometerNumeric', false) . '>Rida (mažiausia)</option>';
        $html .= '</select>';
        $html .= '</div>';
        
        // Apply filters button
        $html .= '<div class="copart-filter-group">';
        $html .= '<button class="copart-apply-filters-btn">Taikyti filtrus</button>';
        $html .= '<button class="copart-clear-filters-btn">Išvalyti</button>';
        $html .= '</div>';
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Generate individual vehicle HTML
     *
     * @param array $vehicle
     * @param array $atts
     * @return string
     */
    public function generate_vehicle_html($vehicle, $atts) {
        $show_images = $atts['show_images'] === 'true';
        $show_bids = $atts['show_bids'] === 'true';
        $show_odometer = $atts['show_odometer'] === 'true';
        $show_location = $atts['show_location'] === 'true';
        
        // No fake data - only use real database fields
        
        $html = '<div class="copart-vehicle" data-lot="' . esc_attr($vehicle['lotNumber']) . '">';
        
        // Badges - only show heart icon, remove source badge
        $html .= '<div class="copart-badges">';
        $html .= '<div class="copart-heart-icon">♥</div>';
        $html .= '</div>';
        
        // Vehicle image
        if ($show_images && !empty($vehicle['imageUrl'])) {
            $html .= '<div class="copart-vehicle-image">';
            $html .= '<img src="' . esc_url($vehicle['imageUrl']) . '" alt="' . esc_attr($vehicle['name']) . '" loading="lazy">';
            $html .= '</div>';
        }
        
        // Vehicle details
        $html .= '<div class="copart-vehicle-details">';
        $html .= '<h3 class="copart-vehicle-name">' . esc_html($vehicle['name']) . '</h3>';
        $html .= '<div class="copart-vehicle-vin">' . esc_html($vehicle['lotNumber']) . '</div>';
        
        // Vehicle specs - only show if we have estimated retail value
        if (!empty($vehicle['estimatedRetailValue'])) {
            $html .= '<div class="copart-vehicle-specs">';
            $html .= '<div class="copart-spec-item">';
            $html .= '<span>Įvertinta vertė: ' . esc_html($vehicle['estimatedRetailValue']) . '</span>';
            $html .= '</div>';
            $html .= '</div>';
        }
        
        // Vehicle info - only show database fields
        $html .= '<div class="copart-vehicle-info">';
        $html .= '<div class="copart-info-left">';
        
        if ($show_odometer && !empty($vehicle['odometer'])) {
            $html .= '<div class="copart-info-item">Rida: ' . esc_html($vehicle['odometer']) . '</div>';
        }
        
        if ($show_location && !empty($vehicle['location'])) {
            $html .= '<div class="copart-info-item">Vieta: ' . esc_html($vehicle['location']) . '</div>';
        }
        
        $html .= '</div>';
        
        $html .= '<div class="copart-info-right">';
        
        if (!empty($vehicle['buyItNowPrice'])) {
            $html .= '<div class="copart-info-item">Pirkite dabar: ' . esc_html($vehicle['buyItNowPrice']) . '</div>';
        }
        
        $html .= '<div class="copart-info-item">Loto Nr.: ' . esc_html($vehicle['lotNumber']) . '</div>';
        
        if (!empty($vehicle['scrapedAt'])) {
            $html .= '<div class="copart-info-item">Atnaujinta: ' . date('Y-m-d', strtotime($vehicle['scrapedAt'])) . '</div>';
        }
        
        $html .= '</div>';
        $html .= '</div>';
        
        $html .= '</div>';
        
        // Auction info - only show database fields
        $html .= '<div class="copart-auction-info">';
        
        // Show estimated retail value if available
        if (!empty($vehicle['estimatedRetailValue'])) {
            $html .= '<div class="copart-estimated-price">';
            $html .= '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
            $html .= '<line x1="3" y1="12" x2="21" y2="12"></line>';
            $html .= '<line x1="3" y1="6" x2="21" y2="6"></line>';
            $html .= '<line x1="3" y1="18" x2="21" y2="18"></line>';
            $html .= '</svg>';
            $html .= esc_html($vehicle['estimatedRetailValue']);
            $html .= '</div>';
        }
        
        // Show last scraped date
        if (!empty($vehicle['scrapedAt'])) {
            $html .= '<div class="copart-auction-date">';
            $html .= '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
            $html .= '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>';
            $html .= '<line x1="16" y1="2" x2="16" y2="6"></line>';
            $html .= '<line x1="8" y1="2" x2="8" y2="6"></line>';
            $html .= '<line x1="3" y1="10" x2="21" y2="10"></line>';
            $html .= '</svg>';
            $html .= date('Y-m-d H:i', strtotime($vehicle['scrapedAt']));
            $html .= '</div>';
        }
        
        // Show current bid if available
        if ($show_bids && !empty($vehicle['currentBid'])) {
            $html .= '<div class="copart-current-bid">' . esc_html($vehicle['currentBid']) . '</div>';
        }
        
        // Show link to original auction
        if (!empty($vehicle['link'])) {
            $html .= '<a href="' . esc_url($vehicle['link']) . '" target="_blank" class="copart-auction-btn">Peržiūrėti aukcioną</a>';
        }
        
        $html .= '</div>';
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Generate pagination HTML
     *
     * @param array $pagination
     * @return string
     */
    public function generate_pagination($pagination) {
        $current_page = $pagination['page'];
        $total_pages = $pagination['pages'];
        
        $html = '<div class="copart-pagination">';
        
        // Previous button
        if ($current_page > 1) {
            $prev_page = $current_page - 1;
            $html .= '<a href="#" class="copart-page-btn copart-page-prev" data-page="' . $prev_page . '">« Ankstesnis</a>';
        }
        
        // Page numbers
        $start_page = max(1, $current_page - 2);
        $end_page = min($total_pages, $current_page + 2);
        
        if ($start_page > 1) {
            $html .= '<a href="#" class="copart-page-btn" data-page="1">1</a>';
            if ($start_page > 2) {
                $html .= '<span class="copart-page-dots">...</span>';
            }
        }
        
        for ($i = $start_page; $i <= $end_page; $i++) {
            $active_class = ($i === $current_page) ? 'copart-page-active' : '';
            $html .= '<a href="#" class="copart-page-btn ' . $active_class . '" data-page="' . $i . '">' . $i . '</a>';
        }
        
        if ($end_page < $total_pages) {
            if ($end_page < $total_pages - 1) {
                $html .= '<span class="copart-page-dots">...</span>';
            }
            $html .= '<a href="#" class="copart-page-btn" data-page="' . $total_pages . '">' . $total_pages . '</a>';
        }
        
        // Next button
        if ($current_page < $total_pages) {
            $next_page = $current_page + 1;
            $html .= '<a href="#" class="copart-page-btn copart-page-next" data-page="' . $next_page . '">Kitas »</a>';
        }
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Get pagination URL
     *
     * @param int $page
     * @return string
     */
    private function get_pagination_url($page) {
        $url = remove_query_arg('copart_page');
        return add_query_arg('copart_page', $page, $url);
    }
    
    /**
     * Generate JavaScript for AJAX functionality
     *
     * @return string
     */
    private function generate_javascript() {
        $ajax_url = admin_url('admin-ajax.php');
        
        return '
        <script>
        jQuery(document).ready(function($) {
            // Range slider synchronization
            function syncRangeInputs() {
                $(".copart-range-slider").on("input", function() {
                    var $this = $(this);
                    var $inputs = $this.siblings(".copart-range-inputs").find("input");
                    var $input = $inputs.eq($this.index());
                    $input.val($this.val());
                });
                
                $(".copart-range-input").on("input", function() {
                    var $this = $(this);
                    var $slider = $this.closest(".copart-price-range").find(".copart-range-slider").eq($this.index());
                    $slider.val($this.val());
                });
            }
            
            // Apply filters
            $(".copart-apply-filters-btn").on("click", function(e) {
                e.preventDefault();
                applyFilters();
            });
            
            // Clear filters
            $(".copart-clear-filters-btn").on("click", function(e) {
                e.preventDefault();
                clearFilters();
            });
            
            // Auto-apply filters on change
            $(".copart-search-input, .copart-location-select, .copart-sort-select").on("change", function() {
                applyFilters(1);
            });
            
            // Handle pagination clicks
            $(document).on("click", ".copart-page-btn", function(e) {
                e.preventDefault();
                var page = $(this).data("page");
                if (page) {
                    applyFilters(page);
                }
            });
            
            function applyFilters(page) {
                page = page || 1;
                var filters = {
                    action: "copart_filter_vehicles",
                    nonce: copart_ajax.nonce,
                    search: $(".copart-search-input").val(),
                    location: $(".copart-location-select").val(),
                    min_bid: $("#price-min").val(),
                    max_bid: $("#price-max").val(),
                    min_odometer: $("#odometer-min").val(),
                    max_odometer: $("#odometer-max").val(),
                    sort_by: $(".copart-sort-select").val(),
                    page: page
                };
                
                // Update URL without page reload
                updateURL(page, filters);
                
                $.ajax({
                    url: "' . $ajax_url . '",
                    type: "POST",
                    data: filters,
                    beforeSend: function() {
                        $("#copart-vehicles-list").html("<div class=\"copart-loading\">Kraunama...</div>");
                    },
                    success: function(response) {
                        if (response.success) {
                            $("#copart-vehicles-list").html(response.data.html);
                            
                            // Debug pagination info
                            if (response.data.pagination_info) {
                                console.log("Pagination info:", response.data.pagination_info);
                            }
                            
                            if (response.data.pagination) {
                                $(".copart-pagination").replaceWith(response.data.pagination);
                            } else {
                                // Remove pagination if no pages or only 1 page
                                $(".copart-pagination").remove();
                            }
                        } else {
                            $("#copart-vehicles-list").html("<div class=\"copart-error\">Klaida: " + response.data + "</div>");
                        }
                    },
                    error: function() {
                        $("#copart-vehicles-list").html("<div class=\"copart-error\">Įvyko klaida kraunant duomenis.</div>");
                    }
                });
            }
            
            function updateURL(page, filters) {
                var url = new URL(window.location);
                url.searchParams.set("copart_page", page);
                
                // Add filter parameters to URL
                if (filters.search) url.searchParams.set("search", filters.search);
                if (filters.location) url.searchParams.set("location", filters.location);
                if (filters.min_bid && filters.min_bid > 0) url.searchParams.set("min_bid", filters.min_bid);
                if (filters.max_bid && filters.max_bid < 100000) url.searchParams.set("max_bid", filters.max_bid);
                if (filters.min_odometer && filters.min_odometer > 0) url.searchParams.set("min_odometer", filters.min_odometer);
                if (filters.max_odometer && filters.max_odometer < 250000) url.searchParams.set("max_odometer", filters.max_odometer);
                if (filters.sort_by && filters.sort_by !== "scrapedAt") url.searchParams.set("sort_by", filters.sort_by);
                
                // Update URL without page reload
                history.pushState({page: page, filters: filters}, "", url.toString());
            }
            
            function clearFilters() {
                $(".copart-search-input").val("");
                $(".copart-location-select").val("");
                $("#price-min, #price-min-input").val(0);
                $("#price-max, #price-max-input").val(100000);
                $("#odometer-min, #odometer-min-input").val(0);
                $("#odometer-max, #odometer-max-input").val(250000);
                $(".copart-sort-select").val("scrapedAt");
                
                // Clear URL parameters
                var url = new URL(window.location);
                url.searchParams.delete("copart_page");
                url.searchParams.delete("search");
                url.searchParams.delete("location");
                url.searchParams.delete("min_bid");
                url.searchParams.delete("max_bid");
                url.searchParams.delete("min_odometer");
                url.searchParams.delete("max_odometer");
                url.searchParams.delete("sort_by");
                
                // Update URL without page reload
                history.pushState({}, "", url.toString());
                
                applyFilters(1);
            }
            
            // Handle browser back/forward buttons
            window.addEventListener("popstate", function(event) {
                if (event.state) {
                    // Restore filters from URL
                    var urlParams = new URLSearchParams(window.location.search);
                    
                    $(".copart-search-input").val(urlParams.get("search") || "");
                    $(".copart-location-select").val(urlParams.get("location") || "");
                    $("#price-min, #price-min-input").val(urlParams.get("min_bid") || 0);
                    $("#price-max, #price-max-input").val(urlParams.get("max_bid") || 100000);
                    $("#odometer-min, #odometer-min-input").val(urlParams.get("min_odometer") || 0);
                    $("#odometer-max, #odometer-max-input").val(urlParams.get("max_odometer") || 250000);
                    $(".copart-sort-select").val(urlParams.get("sort_by") || "scrapedAt");
                    
                    // Apply filters with current page
                    var page = parseInt(urlParams.get("copart_page")) || 1;
                    applyFilters(page);
                }
            });
            
            // Initialize
            syncRangeInputs();
        });
        </script>';
    }
}

