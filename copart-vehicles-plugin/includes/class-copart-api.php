<?php
/**
 * Copart API Handler Class
 *
 * @package CopartVehicles
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Copart_API {
    
    private $api_url;
    private $timeout;
    
    public function __construct() {
        $this->api_url = get_option('copart_api_url', 'http://96.30.192.167:3000');
        $this->timeout = 30;
    }
    
    /**
     * Get vehicles from API
     *
     * @param array $params API parameters
     * @return array|WP_Error
     */
    public function get_vehicles($params = array()) {
        $cache_key = 'copart_vehicles_' . md5(serialize($params));
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $api_url = rtrim($this->api_url, '/') . '/api/vehicles';
        
        // Add query parameters for pagination and filtering
        $query_params = array();
        
        // Pagination
        if (isset($params['page'])) {
            $query_params['page'] = intval($params['page']);
        }
        if (isset($params['limit'])) {
            $query_params['limit'] = intval($params['limit']);
        }
        
        // Filtering
        if (isset($params['search']) && !empty($params['search'])) {
            $query_params['search'] = sanitize_text_field($params['search']);
        }
        if (isset($params['min_bid']) && !empty($params['min_bid'])) {
            $query_params['minBid'] = floatval($params['min_bid']);
        }
        if (isset($params['max_bid']) && !empty($params['max_bid'])) {
            $query_params['maxBid'] = floatval($params['max_bid']);
        }
        if (isset($params['min_odometer']) && !empty($params['min_odometer'])) {
            $query_params['minOdometer'] = intval($params['min_odometer']);
        }
        if (isset($params['max_odometer']) && !empty($params['max_odometer'])) {
            $query_params['maxOdometer'] = intval($params['max_odometer']);
        }
        if (isset($params['location']) && !empty($params['location'])) {
            $query_params['location'] = sanitize_text_field($params['location']);
        }
        
        // Sorting
        if (isset($params['sort_by'])) {
            $query_params['sortBy'] = sanitize_text_field($params['sort_by']);
        }
        if (isset($params['sort_order'])) {
            $query_params['sortOrder'] = sanitize_text_field($params['sort_order']);
        }
        
        // Build URL with query parameters
        if (!empty($query_params)) {
            $api_url .= '?' . http_build_query($query_params);
        }
        
        $response = wp_remote_get($api_url, array(
            'timeout' => $this->timeout,
            'headers' => array(
                'User-Agent' => 'WordPress Copart Plugin/' . COPART_VERSION,
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new WP_Error('api_error', 'API returned status code: ' . $response_code);
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return new WP_Error('api_error', 'Invalid API response format');
        }
        
        // Return both data and pagination info
        $result = array(
            'vehicles' => $data['data'],
            'pagination' => isset($data['pagination']) ? $data['pagination'] : null
        );
        
        // Cache the data
        $cache_duration = get_option('copart_cache_duration', 300);
        set_transient($cache_key, $result, $cache_duration);
        
        return $result;
    }
    
    /**
     * Get locations from API
     *
     * @return array|WP_Error
     */
    public function get_locations() {
        $cache_key = 'copart_locations';
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $api_url = rtrim($this->api_url, '/') . '/api/locations';
        
        $response = wp_remote_get($api_url, array(
            'timeout' => $this->timeout,
            'headers' => array(
                'User-Agent' => 'WordPress Copart Plugin/' . COPART_VERSION,
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new WP_Error('api_error', 'API returned status code: ' . $response_code);
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return new WP_Error('api_error', 'Invalid API response format');
        }
        
        $locations = $data['data'];
        
        // Cache the data
        $cache_duration = get_option('copart_cache_duration', 300);
        set_transient($cache_key, $locations, $cache_duration);
        
        return $locations;
    }
    
    /**
     * Get statistics from API
     *
     * @return array|WP_Error
     */
    public function get_stats() {
        $cache_key = 'copart_stats';
        $cached_data = get_transient($cache_key);
        
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $api_url = rtrim($this->api_url, '/') . '/api/stats';
        
        $response = wp_remote_get($api_url, array(
            'timeout' => $this->timeout,
            'headers' => array(
                'User-Agent' => 'WordPress Copart Plugin/' . COPART_VERSION,
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new WP_Error('api_error', 'API returned status code: ' . $response_code);
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return new WP_Error('api_error', 'Invalid API response format');
        }
        
        $stats = $data['data'];
        
        // Cache the data
        $cache_duration = get_option('copart_cache_duration', 300);
        set_transient($cache_key, $stats, $cache_duration);
        
        return $stats;
    }
    
    /**
     * Test API connection
     *
     * @return bool|WP_Error
     */
    public function test_connection() {
        $api_url = rtrim($this->api_url, '/') . '/api/health';
        
        $response = wp_remote_get($api_url, array(
            'timeout' => 10,
            'headers' => array(
                'User-Agent' => 'WordPress Copart Plugin/' . COPART_VERSION,
                'Accept' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new WP_Error('api_error', 'API returned status code: ' . $response_code);
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return new WP_Error('api_error', 'Invalid API response format');
        }
        
        return true;
    }
    
    /**
     * Clear all cached data
     *
     * @return bool
     */
    public function clear_cache() {
        global $wpdb;
        
        // Clear all copart transients
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_copart_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_copart_%'");
        
        return true;
    }
    
    /**
     * Get API URL
     *
     * @return string
     */
    public function get_api_url() {
        return $this->api_url;
    }
    
    /**
     * Set API URL
     *
     * @param string $url
     */
    public function set_api_url($url) {
        $this->api_url = $url;
        update_option('copart_api_url', $url);
    }
}
