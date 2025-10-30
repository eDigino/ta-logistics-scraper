<?php
/**
 * Plugin Name: Copart Vehicles Display
 * Plugin URI: https://yourwebsite.com
 * Description: Display Copart vehicles using shortcode [copart_vehicles]. Shows vehicles from your deployed scraper API.
 * Version: 1.2.5
 * Author: Ernestas
 * License: GPL v2 or later
 * Text Domain: copart-vehicles
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('COPART_PLUGIN_URL', plugin_dir_url(__FILE__));
define('COPART_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('COPART_VERSION', '1.2.5');

class CopartVehiclesPlugin {
    
    public function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        require_once COPART_PLUGIN_PATH . 'includes/class-copart-api.php';
        require_once COPART_PLUGIN_PATH . 'includes/class-copart-shortcode.php';
        require_once COPART_PLUGIN_PATH . 'admin/class-copart-admin.php';
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_copart_filter_vehicles', array($this, 'ajax_filter_vehicles'));
        add_action('wp_ajax_nopriv_copart_filter_vehicles', array($this, 'ajax_filter_vehicles'));
        
        // Initialize components
        add_action('init', array($this, 'init_components'));
    }
    
    /**
     * Initialize plugin components
     */
    public function init_components() {
        new Copart_Shortcode();
        
        if (is_admin()) {
            new Copart_Admin();
        }
    }
    
    public function init() {
        // Plugin initialization
        load_plugin_textdomain('copart-vehicles', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function enqueue_scripts() {
        wp_enqueue_style('copart-vehicles-style', COPART_PLUGIN_URL . 'assets/style.css', array(), COPART_VERSION);
        wp_enqueue_script('copart-vehicles-script', COPART_PLUGIN_URL . 'assets/script.js', array('jquery'), COPART_VERSION, true);
        
        // Localize script for AJAX
        wp_localize_script('copart-vehicles-script', 'copart_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('copart_nonce')
        ));
    }
    
    /**
     * AJAX handler for filtering vehicles
     */
    public function ajax_filter_vehicles() {
        // Verify nonce for security
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'copart_nonce')) {
            wp_die('Security check failed');
        }
        
        $api = new Copart_API();
        $shortcode = new Copart_Shortcode();
        
        // Get filter parameters
        $params = array(
            'page' => intval($_POST['page'] ?? 1),
            'limit' => 20,
            'search' => sanitize_text_field($_POST['search'] ?? ''),
            'location' => sanitize_text_field($_POST['location'] ?? ''),
            'min_bid' => floatval($_POST['min_bid'] ?? 0),
            'max_bid' => floatval($_POST['max_bid'] ?? 100000),
            'min_odometer' => intval($_POST['min_odometer'] ?? 0),
            'max_odometer' => intval($_POST['max_odometer'] ?? 250000),
            'sort_by' => sanitize_text_field($_POST['sort_by'] ?? 'scrapedAt'),
            'sort_order' => 'desc',
            // Add display attributes
            'show_images' => 'true',
            'show_bids' => 'true',
            'show_odometer' => 'true',
            'show_location' => 'true'
        );
        
        // Get vehicles from API
        $result = $api->get_vehicles($params);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        $vehicles = $result['vehicles'];
        $pagination = $result['pagination'];
        
        // Generate HTML
        $html = '';
        if (empty($vehicles)) {
            $html .= '<div class="copart-no-vehicles">Nerasta transporto priemonių, atitinkančių jūsų kriterijus.</div>';
        } else {
            foreach ($vehicles as $vehicle) {
                $html .= $shortcode->generate_vehicle_html($vehicle, $params);
            }
        }
        
        // Generate pagination HTML
        $pagination_html = '';
        if ($pagination && $pagination['pages'] > 1) {
            $pagination_html = $shortcode->generate_pagination($pagination);
        }
        
        wp_send_json_success(array(
            'html' => $html,
            'pagination' => $pagination_html,
            'pagination_info' => $pagination // Include pagination info for debugging
        ));
    }
}

// Initialize the plugin
new CopartVehiclesPlugin();

// Activation hook
register_activation_hook(__FILE__, function() {
    // Set default options
    add_option('copart_api_url', 'http://96.30.192.167:3000');
    add_option('copart_cache_duration', 300);
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Clear transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_copart_vehicles_%'");
});
