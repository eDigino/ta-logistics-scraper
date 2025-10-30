<?php
/**
 * Plugin Installation Script
 *
 * @package CopartVehicles
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin activation hook
 */
function copart_vehicles_activate() {
    // Set default options
    add_option('copart_api_url', 'http://96.30.192.167:3000');
    add_option('copart_cache_duration', 300);
    
    // Create database tables if needed (for future features)
    copart_vehicles_create_tables();
    
    // Flush rewrite rules
    flush_rewrite_rules();
}

/**
 * Plugin deactivation hook
 */
function copart_vehicles_deactivate() {
    // Clear all transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_copart_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_copart_%'");
    
    // Flush rewrite rules
    flush_rewrite_rules();
}

/**
 * Plugin uninstall hook
 */
function copart_vehicles_uninstall() {
    // Remove options
    delete_option('copart_api_url');
    delete_option('copart_cache_duration');
    
    // Clear all transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_copart_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_copart_%'");
    
    // Drop custom tables if they exist
    copart_vehicles_drop_tables();
}

/**
 * Create custom database tables
 */
function copart_vehicles_create_tables() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    // Table for storing vehicle cache (optional, for future features)
    $table_name = $wpdb->prefix . 'copart_vehicles_cache';
    
    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        lot_number varchar(50) NOT NULL,
        vehicle_data longtext NOT NULL,
        cached_at datetime DEFAULT CURRENT_TIMESTAMP,
        expires_at datetime NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY lot_number (lot_number),
        KEY expires_at (expires_at)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

/**
 * Drop custom database tables
 */
function copart_vehicles_drop_tables() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'copart_vehicles_cache';
    $wpdb->query("DROP TABLE IF EXISTS $table_name");
}

// Register activation and deactivation hooks
register_activation_hook(__FILE__, 'copart_vehicles_activate');
register_deactivation_hook(__FILE__, 'copart_vehicles_deactivate');
register_uninstall_hook(__FILE__, 'copart_vehicles_uninstall');
