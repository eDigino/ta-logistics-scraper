# Copart Vehicles WordPress Plugin

## Installation Instructions

### 1. Upload Plugin Files

Upload the entire `copart-vehicles-plugin` folder to your WordPress plugins directory:
```
/wp-content/plugins/copart-vehicles-plugin/
```

### 2. Activate Plugin

1. Go to your WordPress admin dashboard
2. Navigate to **Plugins** → **Installed Plugins**
3. Find "Copart Vehicles Display" and click **Activate**

### 3. Configure Settings

1. Go to **Settings** → **Copart Vehicles**
2. Enter your API URL (default: `http://96.30.192.167:3000`)
3. Set cache duration (default: 300 seconds)
4. Click **Test Connection** to verify API is working
5. Click **Save Changes**

### 4. Use the Shortcode

Add the shortcode to any page or post:
```
[copart_vehicles]
```

## Shortcode Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 20 | Number of vehicles to display |
| `show_images` | true | Show vehicle images (true/false) |
| `show_bids` | true | Show bid information (true/false) |
| `show_odometer` | true | Show odometer reading (true/false) |
| `show_location` | true | Show vehicle location (true/false) |
| `layout` | grid | Display layout (grid/list/table) |
| `sort_by` | latest | Sort order (latest/bid_high/bid_low/odometer_low/odometer_high) |
| `filter_location` | | Filter by location (partial match) |
| `min_bid` | | Minimum bid amount |
| `max_bid` | | Maximum bid amount |

## Examples

### Basic Usage
```
[copart_vehicles]
```

### Show 10 vehicles in list format
```
[copart_vehicles limit="10" layout="list"]
```

### Show highest bids over $1000
```
[copart_vehicles sort_by="bid_high" min_bid="1000"]
```

### California vehicles without images
```
[copart_vehicles filter_location="CA" show_images="false"]
```

### Table layout with custom sorting
```
[copart_vehicles layout="table" sort_by="odometer_low" limit="15"]
```

## File Structure

```
copart-vehicles-plugin/
├── copart-vehicles-plugin.php    # Main plugin file
├── readme.txt                    # Plugin readme
├── install.php                   # Installation hooks
├── INSTALLATION.md               # This file
├── assets/
│   ├── style.css                 # Frontend styles
│   └── script.js                 # Frontend JavaScript
├── includes/
│   ├── class-copart-api.php      # API handler
│   └── class-copart-shortcode.php # Shortcode handler
└── admin/
    ├── class-copart-admin.php    # Admin interface
    ├── css/
    │   └── admin.css             # Admin styles
    └── js/
        └── admin.js              # Admin JavaScript
```

## Features

- ✅ **Responsive Design** - Works on all devices
- ✅ **Multiple Layouts** - Grid, List, and Table views
- ✅ **Advanced Filtering** - Filter by location, bid range, etc.
- ✅ **Smart Caching** - Configurable cache duration
- ✅ **Admin Interface** - Easy settings management
- ✅ **Error Handling** - Graceful error messages
- ✅ **Performance Optimized** - Lazy loading and efficient queries
- ✅ **SEO Friendly** - Proper HTML structure and meta tags

## Troubleshooting

### API Connection Issues
1. Check your API URL in Settings → Copart Vehicles
2. Ensure your server is running and accessible
3. Test the connection using the "Test Connection" button

### No Vehicles Displaying
1. Check if your scraper is running and has data
2. Verify the API endpoints are working
3. Clear the cache using the "Clear Cache" button

### Styling Issues
1. Check if your theme conflicts with plugin styles
2. Add custom CSS to override plugin styles if needed
3. Ensure the plugin CSS is loading (check browser dev tools)

## Support

For support and updates, please refer to the plugin documentation or contact the developer.

## Changelog

### Version 1.1.0
- **Major Update:** Now displays only real database fields (no fake data)
- Improved single-column list layout design
- Better responsive design for mobile devices
- Cleaner vehicle card display
- Removed fake vehicle specs and status information
- Enhanced data accuracy and reliability
- Updated author to Ernestas

### Version 1.0.0
- Initial release
- Shortcode functionality
- Multiple layouts (grid, list, table)
- Filtering and sorting
- Admin settings page
- Responsive design
- Caching system
