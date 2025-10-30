/**
 * Copart Admin JavaScript
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        initAdmin();
    });
    
    function initAdmin() {
        // Test connection button
        $('#test-connection').on('click', function() {
            testConnection();
        });
        
        // Clear cache button
        $('#clear-cache').on('click', function() {
            clearCache();
        });
    }
    
    function testConnection() {
        var $button = $('#test-connection');
        var $result = $('#connection-result');
        var originalText = $button.text();
        
        $button.prop('disabled', true).text(copart_admin.strings.testing);
        $result.hide();
        
        $.ajax({
            url: copart_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'copart_test_connection',
                nonce: copart_admin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $result.removeClass('error').addClass('success')
                          .text(copart_admin.strings.success).show();
                } else {
                    $result.removeClass('success').addClass('error')
                          .text(copart_admin.strings.error + ' ' + response.data).show();
                }
            },
            error: function() {
                $result.removeClass('success').addClass('error')
                      .text(copart_admin.strings.error).show();
            },
            complete: function() {
                $button.prop('disabled', false).text(originalText);
            }
        });
    }
    
    function clearCache() {
        var $button = $('#clear-cache');
        var originalText = $button.text();
        
        if (!confirm('Are you sure you want to clear the cache? This will force fresh data to be fetched from the API.')) {
            return;
        }
        
        $button.prop('disabled', true).text(copart_admin.strings.clearing);
        
        $.ajax({
            url: copart_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'copart_clear_cache',
                nonce: copart_admin.nonce
            },
            success: function(response) {
                if (response.success) {
                    alert(copart_admin.strings.cleared);
                } else {
                    alert('Error: ' + response.data);
                }
            },
            error: function() {
                alert('Error clearing cache. Please try again.');
            },
            complete: function() {
                $button.prop('disabled', false).text(originalText);
            }
        });
    }
    
})(jQuery);
