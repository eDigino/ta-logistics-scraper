<?php
/**
 * Copart Admin Class
 *
 * @package CopartVehicles
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Copart_Admin {
    
    private $api;
    
    public function __construct() {
        $this->api = new Copart_API();
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_copart_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_copart_clear_cache', array($this, 'ajax_clear_cache'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Copart Vehicles Settings',
            'Copart Vehicles',
            'manage_options',
            'copart-vehicles',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Initialize admin settings
     */
    public function admin_init() {
        register_setting('copart_settings', 'copart_api_url');
        register_setting('copart_settings', 'copart_cache_duration');
        
        add_settings_section(
            'copart_api_section',
            'API Settings',
            array($this, 'api_section_callback'),
            'copart-vehicles'
        );
        
        add_settings_field(
            'copart_api_url',
            'API URL',
            array($this, 'api_url_callback'),
            'copart-vehicles',
            'copart_api_section'
        );
        
        add_settings_field(
            'copart_cache_duration',
            'Cache Duration (seconds)',
            array($this, 'cache_duration_callback'),
            'copart-vehicles',
            'copart_api_section'
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function admin_enqueue_scripts($hook) {
        if ($hook !== 'settings_page_copart-vehicles') {
            return;
        }
        
        wp_enqueue_script('copart-admin', COPART_PLUGIN_URL . 'admin/js/admin.js', array('jquery'), COPART_VERSION, true);
        wp_enqueue_style('copart-admin', COPART_PLUGIN_URL . 'admin/css/admin.css', array(), COPART_VERSION);
        
        wp_localize_script('copart-admin', 'copart_admin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('copart_admin_nonce'),
            'strings' => array(
                'testing' => __('Testing connection...', 'copart-vehicles'),
                'success' => __('Connection successful!', 'copart-vehicles'),
                'error' => __('Connection failed!', 'copart-vehicles'),
                'clearing' => __('Clearing cache...', 'copart-vehicles'),
                'cleared' => __('Cache cleared!', 'copart-vehicles')
            )
        ));
    }
    
    /**
     * API section callback
     */
    public function api_section_callback() {
        echo '<p>' . __('Configure your Copart API settings below.', 'copart-vehicles') . '</p>';
    }
    
    /**
     * API URL field callback
     */
    public function api_url_callback() {
        $value = get_option('copart_api_url', 'http://96.30.192.167:3000');
        echo '<input type="url" name="copart_api_url" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<button type="button" id="test-connection" class="button">' . __('Test Connection', 'copart-vehicles') . '</button>';
        echo '<div id="connection-result"></div>';
        echo '<p class="description">' . __('Enter the URL of your Copart API server.', 'copart-vehicles') . '</p>';
    }
    
    /**
     * Cache duration field callback
     */
    public function cache_duration_callback() {
        $value = get_option('copart_cache_duration', 300);
        echo '<input type="number" name="copart_cache_duration" value="' . esc_attr($value) . '" min="60" max="3600" />';
        echo '<p class="description">' . __('How long to cache API responses (60-3600 seconds)', 'copart-vehicles') . '</p>';
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Copart Vehicles Settings', 'copart-vehicles'); ?></h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('copart_settings');
                do_settings_sections('copart-vehicles');
                submit_button();
                ?>
            </form>
            
            <div class="copart-admin-actions">
                <h2><?php _e('Actions', 'copart-vehicles'); ?></h2>
                <button type="button" id="clear-cache" class="button button-secondary">
                    <?php _e('Clear Cache', 'copart-vehicles'); ?>
                </button>
            </div>
            
            <div class="copart-admin-info">
                <h2><?php _e('Shortcode Usage', 'copart-vehicles'); ?></h2>
                <p><?php _e('Use the', 'copart-vehicles'); ?> <code>[copart_vehicles]</code> <?php _e('shortcode to display vehicles on any page or post.', 'copart-vehicles'); ?></p>
                
                <h3><?php _e('Available Parameters:', 'copart-vehicles'); ?></h3>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Parameter', 'copart-vehicles'); ?></th>
                            <th><?php _e('Default', 'copart-vehicles'); ?></th>
                            <th><?php _e('Description', 'copart-vehicles'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>limit</td><td>20</td><td><?php _e('Number of vehicles to display', 'copart-vehicles'); ?></td></tr>
                        <tr><td>show_images</td><td>true</td><td><?php _e('Show vehicle images (true/false)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>show_bids</td><td>true</td><td><?php _e('Show bid information (true/false)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>show_odometer</td><td>true</td><td><?php _e('Show odometer reading (true/false)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>show_location</td><td>true</td><td><?php _e('Show vehicle location (true/false)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>layout</td><td>grid</td><td><?php _e('Display layout (grid/list/table)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>sort_by</td><td>latest</td><td><?php _e('Sort order (latest/bid_high/bid_low/odometer_low/odometer_high)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>filter_location</td><td></td><td><?php _e('Filter by location (partial match)', 'copart-vehicles'); ?></td></tr>
                        <tr><td>min_bid</td><td></td><td><?php _e('Minimum bid amount', 'copart-vehicles'); ?></td></tr>
                        <tr><td>max_bid</td><td></td><td><?php _e('Maximum bid amount', 'copart-vehicles'); ?></td></tr>
                    </tbody>
                </table>
                
                <h3><?php _e('Examples:', 'copart-vehicles'); ?></h3>
                <ul>
                    <li><code>[copart_vehicles limit="10" layout="list"]</code> - <?php _e('Show 10 vehicles in list format', 'copart-vehicles'); ?></li>
                    <li><code>[copart_vehicles sort_by="bid_high" min_bid="1000"]</code> - <?php _e('Show highest bids over $1000', 'copart-vehicles'); ?></li>
                    <li><code>[copart_vehicles filter_location="CA" show_images="false"]</code> - <?php _e('California vehicles without images', 'copart-vehicles'); ?></li>
                </ul>
            </div>
            
            <?php $this->display_api_status(); ?>
        </div>
        <?php
    }
    
    /**
     * Display API status
     */
    private function display_api_status() {
        $stats = $this->api->get_stats();
        
        if (is_wp_error($stats)) {
            echo '<div class="notice notice-error"><p>' . __('Unable to fetch API statistics: ', 'copart-vehicles') . $stats->get_error_message() . '</p></div>';
            return;
        }
        
        ?>
        <div class="copart-admin-stats">
            <h2><?php _e('API Statistics', 'copart-vehicles'); ?></h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Total Vehicles:', 'copart-vehicles'); ?></span>
                    <span class="stat-value"><?php echo number_format($stats['totalVehicles']); ?></span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Average Bid:', 'copart-vehicles'); ?></span>
                    <span class="stat-value">$<?php echo number_format($stats['avgBid'], 2); ?></span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Average Odometer:', 'copart-vehicles'); ?></span>
                    <span class="stat-value"><?php echo number_format($stats['avgOdometer']); ?> mi</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Latest Scrape:', 'copart-vehicles'); ?></span>
                    <span class="stat-value"><?php echo date('M j, Y g:i A', strtotime($stats['latestScrape'])); ?></span>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * AJAX test connection
     */
    public function ajax_test_connection() {
        check_ajax_referer('copart_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'copart-vehicles'));
        }
        
        $result = $this->api->test_connection();
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success(__('Connection successful!', 'copart-vehicles'));
        }
    }
    
    /**
     * AJAX clear cache
     */
    public function ajax_clear_cache() {
        check_ajax_referer('copart_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'copart-vehicles'));
        }
        
        $result = $this->api->clear_cache();
        
        if ($result) {
            wp_send_json_success(__('Cache cleared successfully!', 'copart-vehicles'));
        } else {
            wp_send_json_error(__('Failed to clear cache.', 'copart-vehicles'));
        }
    }
}
