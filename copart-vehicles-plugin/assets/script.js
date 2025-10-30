/**
 * Copart Vehicles Plugin JavaScript
 * Bid.cars inspired functionality
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        initCopartVehicles();
    });
    
    function initCopartVehicles() {
        // Initialize filter interactions
        initFilters();
        
        // Initialize navigation tabs
        initNavigationTabs();
        
        // Initialize heart icons (favorites)
        initHeartIcons();
        
        // Initialize sort functionality
        initSortButton();
        
        // Initialize range sliders
        initRangeSliders();
        
        // Initialize auction type buttons
        initAuctionTypeButtons();
        
        // Initialize make tags
        initMakeTags();
    }
    
    /**
     * Initialize filter interactions
     */
    function initFilters() {
        // Price range sliders
        $('.copart-range-slider').on('input', function() {
            var sliderId = $(this).attr('id');
            var inputId = sliderId + '-input';
            $('#' + inputId).val($(this).val());
            updateFilters();
        });
        
        // Price range inputs
        $('.copart-range-input').on('input', function() {
            var inputId = $(this).attr('id');
            if (inputId && inputId.includes('-input')) {
                var sliderId = inputId.replace('-input', '');
                $('#' + sliderId).val($(this).val());
            }
            updateFilters();
        });
        
        // Year inputs
        $('.copart-year-input').on('input', function() {
            updateFilters();
        });
        
    }
    
    /**
     * Initialize navigation tabs
     */
    function initNavigationTabs() {
        $('.copart-nav-tab').on('click', function() {
            $('.copart-nav-tab').removeClass('active');
            $(this).addClass('active');
            
            var tabText = $(this).text().trim();
            filterByTab(tabText);
        });
    }
    
    /**
     * Initialize heart icons (favorites)
     */
    function initHeartIcons() {
        $('.copart-heart-icon').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            $(this).toggleClass('liked');
            
            var lotNumber = $(this).closest('.copart-vehicle').data('lot');
            var isLiked = $(this).hasClass('liked');
            
            // Store favorite state in localStorage
            var favorites = getFavorites();
            if (isLiked) {
                if (!favorites.includes(lotNumber)) {
                    favorites.push(lotNumber);
                }
            } else {
                favorites = favorites.filter(lot => lot !== lotNumber);
            }
            setFavorites(favorites);
            
            // Show feedback
            showNotification(isLiked ? 'Added to favorites' : 'Removed from favorites');
        });
        
        // Load saved favorites
        loadFavorites();
    }
    
    /**
     * Initialize sort button
     */
    function initSortButton() {
        $('.copart-sort-btn').on('click', function() {
            showSortModal();
        });
    }
    
    /**
     * Initialize range sliders with dual handles
     */
    function initRangeSliders() {
        // This would require a more complex implementation for dual-handle sliders
        // For now, we'll use the basic HTML5 range inputs
    }
    
    /**
     * Initialize auction type buttons
     */
    function initAuctionTypeButtons() {
        $('.copart-auction-btn').on('click', function() {
            if ($(this).closest('.copart-auction-type').length > 0) {
                $('.copart-auction-type .copart-auction-btn').removeClass('active');
                $(this).addClass('active');
                updateFilters();
            }
        });
    }
    
    /**
     * Initialize make tags
     */
    function initMakeTags() {
        $('.copart-make-tag').on('click', function() {
            $(this).toggleClass('active');
            updateFilters();
        });
        
        // Initialize "See more" functionality
        initSeeMoreBrands();
    }
    
    /**
     * Initialize "See more" brands functionality
     */
    function initSeeMoreBrands() {
        // Add more car brands that are initially hidden
        var moreBrands = [
            'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai',
            'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Maserati', 'Mazda',
            'McLaren', 'Mercedes-Benz', 'MINI', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Rolls-Royce', 'Subaru', 'Tesla',
            'Toyota', 'Volkswagen', 'Volvo', 'Ferrari', 'Lotus', 'Bugatti', 'Koenigsegg', 'Pagani', 'Rimac', 'Polestar',
            'Rivian', 'Lucid', 'Fisker', 'Canoo', 'Lordstown', 'Nikola', 'Workhorse', 'Arrival', 'Bollinger', 'Faraday Future',
            'Karma', 'Mullen', 'Proterra', 'Rivian', 'Lordstown', 'Nikola', 'Workhorse', 'Arrival', 'Bollinger', 'Faraday Future'
        ];
        
        // Store the original brands
        var originalBrands = $('.copart-make-tag').map(function() {
            return $(this).text().trim();
        }).get();
        
        // Add more brands to the container
        var $makeTagsContainer = $('.copart-make-tags');
        moreBrands.forEach(function(brand) {
            if (originalBrands.indexOf(brand) === -1) {
                $makeTagsContainer.append('<span class="copart-make-tag copart-make-tag-hidden">' + brand + '</span>');
            }
        });
        
        // Initially hide the additional brands
        $('.copart-make-tag-hidden').hide();
        
        // Handle "See more" click
        $('.copart-see-more').on('click', function(e) {
            e.preventDefault();
            
            var $this = $(this);
            var isExpanded = $this.data('expanded') || false;
            
            if (!isExpanded) {
                // Show hidden brands
                $('.copart-make-tag-hidden').fadeIn(300);
                $this.text('Rodyti mažiau');
                $this.data('expanded', true);
            } else {
                // Hide additional brands
                $('.copart-make-tag-hidden').fadeOut(300);
                $this.text('Rodyti daugiau (' + $('.copart-make-tag-hidden').length + ')');
                $this.data('expanded', false);
            }
        });
        
        // Add click handlers to the new tags
        $(document).on('click', '.copart-make-tag-hidden', function() {
            $(this).toggleClass('active');
            updateFilters();
        });
    }
    
    /**
     * Update filters and refresh results
     */
    function updateFilters() {
        var filters = {
            priceMin: $('#price-min-input').val() || 0,
            priceMax: $('#price-max-input').val() || 100000,
            yearMin: $('.copart-year-input').first().val() || 1900,
            yearMax: $('.copart-year-input').last().val() || 2026,
            auctionType: $('.copart-auction-type .copart-auction-btn.active').text().trim(),
            odometerMin: $('#odometer-min-input').val() || 0,
            odometerMax: $('#odometer-max-input').val() || 250000,
            startCode: $('input[placeholder="Enter start code"]').val(),
            selectedMakes: $('.copart-make-tag.active').map(function() {
                return $(this).text().trim();
            }).get()
        };
        
        // Apply filters to vehicles
        applyFilters(filters);
        
        // Store filters in localStorage
        localStorage.setItem('copart_filters', JSON.stringify(filters));
    }
    
    /**
     * Apply filters to vehicle listings
     */
    function applyFilters(filters) {
        $('.copart-vehicle').each(function() {
            var $vehicle = $(this);
            var shouldShow = true;
            
            // Get vehicle data from data attributes or parse from content
            var vehicleData = getVehicleData($vehicle);
            
            // Apply price filter
            if (vehicleData.currentBidNumeric < filters.priceMin || vehicleData.currentBidNumeric > filters.priceMax) {
                shouldShow = false;
            }
            
            // Apply year filter
            if (vehicleData.year < filters.yearMin || vehicleData.year > filters.yearMax) {
                shouldShow = false;
            }
            
            // Apply odometer filter
            if (vehicleData.odometerNumeric < filters.odometerMin || vehicleData.odometerNumeric > filters.odometerMax) {
                shouldShow = false;
            }
            
            // Apply make filter
            if (filters.selectedMakes.length > 0) {
                var vehicleMake = extractMake(vehicleData.name);
                console.log('Vehicle:', vehicleData.name, '| Extracted Make:', vehicleMake, '| Selected Makes:', filters.selectedMakes);
                if (!filters.selectedMakes.includes(vehicleMake)) {
                    shouldShow = false;
                }
            }
            
            // Show/hide vehicle
            if (shouldShow) {
                $vehicle.show();
            } else {
                $vehicle.hide();
            }
        });
        
        // Update results count
        updateResultsCount();
    }
    
    /**
     * Filter by navigation tab
     */
    function filterByTab(tabText) {
        $('.copart-vehicle').each(function() {
            var $vehicle = $(this);
            var shouldShow = true;
            
            // This would need to be implemented based on actual data structure
            // For now, we'll just show all vehicles
            switch (tabText) {
                case 'All':
                    shouldShow = true;
                    break;
                case 'Opened Auction':
                    // Filter for opened auctions
                    shouldShow = true;
                    break;
                case 'Live':
                    // Filter for live auctions
                    shouldShow = false;
                    break;
                case 'Finished Today':
                    // Filter for finished auctions
                    shouldShow = false;
                    break;
                case 'Fast Buy':
                    // Filter for fast buy options
                    shouldShow = false;
                    break;
            }
            
            if (shouldShow) {
                $vehicle.show();
            } else {
                $vehicle.hide();
            }
        });
        
        updateResultsCount();
    }
    
    /**
     * Get vehicle data from DOM element
     */
    function getVehicleData($vehicle) {
        var name = $vehicle.find('.copart-vehicle-name').text().trim();
        var currentBid = $vehicle.find('.copart-current-bid').text().trim();
        var odometer = $vehicle.find('.copart-info-item').filter(function() {
            return $(this).text().includes('Milage:');
        }).text().trim();
        
        return {
            name: name,
            currentBidNumeric: parseFloat(currentBid.replace(/[^\d.]/g, '')) || 0,
            year: extractYear(name),
            odometerNumeric: parseFloat(odometer.replace(/[^\d]/g, '')) || 0
        };
    }
    
    /**
     * Extract year from vehicle name
     */
    function extractYear(name) {
        var match = name.match(/(\d{4})/);
        return match ? parseInt(match[1]) : 0;
    }
    
    /**
     * Extract make from vehicle name
     */
    function extractMake(name) {
        // Common car makes to match against
        var makes = [
            'Acura', 'Alfa Romeo', 'American Motors', 'Aston Martin', 'Audi', 'Austin', 'Bentley', 'BMW', 'Buick',
            'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai',
            'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Maserati', 'Mazda',
            'McLaren', 'Mercedes-Benz', 'MINI', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Rolls-Royce', 'Subaru', 'Tesla',
            'Toyota', 'Volkswagen', 'Volvo', 'Ferrari', 'Lotus', 'Bugatti', 'Koenigsegg', 'Pagani', 'Rimac', 'Polestar',
            'Rivian', 'Lucid', 'Fisker', 'Canoo', 'Lordstown', 'Nikola', 'Workhorse', 'Arrival', 'Bollinger', 'Faraday Future',
            'Karma', 'Mullen', 'Proterra', 'Bollinger', 'Faraday Future'
        ];
        
        // Convert name to uppercase for case-insensitive matching
        var upperName = name.toUpperCase();
        
        // Try to find a make in the vehicle name
        for (var i = 0; i < makes.length; i++) {
            var make = makes[i];
            if (upperName.includes(make.toUpperCase())) {
                return make;
            }
        }
        
        // Fallback: try to extract from the beginning of the name (after year)
        var words = name.split(' ');
        if (words.length > 1) {
            // Skip year if it's the first word
            var startIndex = /^\d{4}$/.test(words[0]) ? 1 : 0;
            if (words[startIndex]) {
                return words[startIndex];
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * Update results count
     */
    function updateResultsCount() {
        var visibleCount = $('.copart-vehicle:visible').length;
        var totalCount = $('.copart-vehicle').length;
        
        // You could add a results counter element here
        console.log('Showing ' + visibleCount + ' of ' + totalCount + ' vehicles');
    }
    
    /**
     * Show sort modal
     */
    function showSortModal() {
        // This would open a modal with sort options
        // For now, we'll just show an alert
        var sortOptions = [
            'Latest',
            'Bid High to Low',
            'Bid Low to High',
            'Odometer Low to High',
            'Odometer High to Low',
            'Year Newest First',
            'Year Oldest First'
        ];
        
        var selectedOption = prompt('Sort by:\n' + sortOptions.map((opt, i) => (i + 1) + '. ' + opt).join('\n'));
        
        if (selectedOption && !isNaN(selectedOption)) {
            var optionIndex = parseInt(selectedOption) - 1;
            if (optionIndex >= 0 && optionIndex < sortOptions.length) {
                sortVehicles(sortOptions[optionIndex]);
            }
        }
    }
    
    /**
     * Sort vehicles
     */
    function sortVehicles(sortBy) {
        var $container = $('.copart-vehicles-list');
        var $vehicles = $container.find('.copart-vehicle').toArray();
        
        $vehicles.sort(function(a, b) {
            var $a = $(a);
            var $b = $(b);
            var dataA = getVehicleData($a);
            var dataB = getVehicleData($b);
            
            switch (sortBy) {
                case 'Bid High to Low':
                    return dataB.currentBidNumeric - dataA.currentBidNumeric;
                case 'Bid Low to High':
                    return dataA.currentBidNumeric - dataB.currentBidNumeric;
                case 'Odometer Low to High':
                    return dataA.odometerNumeric - dataB.odometerNumeric;
                case 'Odometer High to Low':
                    return dataB.odometerNumeric - dataA.odometerNumeric;
                case 'Year Newest First':
                    return dataB.year - dataA.year;
                case 'Year Oldest First':
                    return dataA.year - dataB.year;
                case 'Latest':
                default:
                    return 0; // Keep original order
            }
        });
        
        $container.empty().append($vehicles);
        showNotification('Sorted by: ' + sortBy);
    }
    
    /**
     * Get favorites from localStorage
     */
    function getFavorites() {
        var favorites = localStorage.getItem('copart_favorites');
        return favorites ? JSON.parse(favorites) : [];
    }
    
    /**
     * Set favorites in localStorage
     */
    function setFavorites(favorites) {
        localStorage.setItem('copart_favorites', JSON.stringify(favorites));
    }
    
    /**
     * Load saved favorites
     */
    function loadFavorites() {
        var favorites = getFavorites();
        $('.copart-vehicle').each(function() {
            var lotNumber = $(this).data('lot');
            if (favorites.includes(lotNumber)) {
                $(this).find('.copart-heart-icon').addClass('liked');
            }
        });
    }
    
    /**
     * Show notification
     */
    function showNotification(message) {
        // Create notification element
        var $notification = $('<div class="copart-notification">' + message + '</div>');
        
        // Add styles
        $notification.css({
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#007bff',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '4px',
            zIndex: 9999,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Add to page
        $('body').append($notification);
        
        // Animate in
        setTimeout(function() {
            $notification.css('transform', 'translateX(0)');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(function() {
            $notification.css('transform', 'translateX(100%)');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Load saved filters
     */
    function loadSavedFilters() {
        var savedFilters = localStorage.getItem('copart_filters');
        if (savedFilters) {
            var filters = JSON.parse(savedFilters);
            
            // Apply saved filter values
            $('#price-min-input').val(filters.priceMin);
            $('#price-max-input').val(filters.priceMax);
            $('#price-min').val(filters.priceMin);
            $('#price-max').val(filters.priceMax);
            
            $('.copart-year-input').first().val(filters.yearMin);
            $('.copart-year-input').last().val(filters.yearMax);
            
            $('#odometer-min-input').val(filters.odometerMin);
            $('#odometer-max-input').val(filters.odometerMax);
            $('#odometer-min').val(filters.odometerMin);
            $('#odometer-max').val(filters.odometerMax);
            
            $('input[placeholder="Enter start code"]').val(filters.startCode);
            
            // Apply saved make selections
            $('.copart-make-tag').removeClass('active');
            filters.selectedMakes.forEach(function(make) {
                $('.copart-make-tag').filter(function() {
                    return $(this).text().trim() === make;
                }).addClass('active');
            });
            
            // Apply saved auction type
            $('.copart-auction-type .copart-auction-btn').removeClass('active');
            $('.copart-auction-type .copart-auction-btn').filter(function() {
                return $(this).text().trim() === filters.auctionType;
            }).addClass('active');
        }
    }
    
    // Load saved filters on page load
    $(document).ready(function() {
        loadSavedFilters();
    });
    
})(jQuery);