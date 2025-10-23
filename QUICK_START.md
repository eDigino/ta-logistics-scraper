# Quick Start Guide

## First Time Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure MongoDB
```bash
# Copy the environment template
cp env.example .env

# Edit .env with your MongoDB credentials
# Get connection string from: https://cloud.mongodb.com
```

### 3. Validate Configuration
```bash
npm run validate-env
```
✅ This checks if your `.env` file is properly formatted

### 4. Test Database Connection
```bash
npm run test-db
```
✅ This confirms you can connect to MongoDB

### 5. Run the Scraper
```bash
npm start
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run the scraper (collect vehicle data) |
| `npm run validate-env` | Validate `.env` configuration |
| `npm run test-db` | Test MongoDB connection |
| `npm run dev` | Run scraper with auto-reload |

## Common Issues & Quick Fixes

### ❌ TLS/SSL Connection Error

**Problem:** Configuration looks good but connection fails

**Fix:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Database Access** → Verify user exists
3. **Database Access** → Edit user → Autogenerate new password
4. Copy the new password
5. Update `.env` file with new password
6. **Network Access** → Verify 0.0.0.0/0 is allowed
7. Test again: `npm run test-db`

### ❌ .env File Not Found

**Fix:**
```bash
cp env.example .env
# Then edit .env with your credentials
```

### ❌ Placeholder Values in .env

**Fix:** Open `.env` and replace:
- `your_username` → Your actual MongoDB username
- `your_password` → Your actual MongoDB password
- `cluster0.xxxxx` → Your actual cluster address

### ❌ Special Characters in Password

**Fix:** URL encode them:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`

Or create a new password without special characters.

## Troubleshooting Workflow

```
┌─────────────────────────┐
│  npm run validate-env   │  ← Start here
└───────────┬─────────────┘
            │
            ├─ ❌ Fails? → Fix .env file
            │
            ├─ ✅ Passes
            │
┌───────────▼─────────────┐
│    npm run test-db      │  ← Then test connection
└───────────┬─────────────┘
            │
            ├─ ❌ Fails? → Check MongoDB Atlas settings
            │              (see MONGODB_SETUP.md)
            │
            ├─ ✅ Passes
            │
┌───────────▼─────────────┐
│      npm start          │  ← Ready to scrape!
└─────────────────────────┘
```

## Need More Help?

1. **Quick fixes:** Check the table above
2. **Detailed guide:** Read [MONGODB_SETUP.md](MONGODB_SETUP.md)
3. **Full docs:** See [README.md](README.md)

## Most Common Solution (Works 90% of the time)

```bash
# 1. Go to MongoDB Atlas → Database Access
# 2. Edit your database user
# 3. Click "Edit Password"
# 4. Click "Autogenerate Secure Password"
# 5. COPY the password immediately
# 6. Update .env:

MONGODB_URI=mongodb+srv://your_username:PASTE_PASSWORD_HERE@cluster.mongodb.net/?retryWrites=true&w=majority

# 7. Test again:
npm run test-db
```

## Current Status

Based on your configuration:
- ✅ `.env` file exists
- ✅ Configuration format is correct
- ✅ Username: `andriuskeviciusernestas_db_user`
- ✅ Cluster: `scrapping-tool.dddycyc.mongodb.net`
- ❌ **Connection fails** → Likely password issue

### Next Step for You

The most likely issue is that the password in your `.env` file doesn't match what's configured in MongoDB Atlas.

**Recommended action:**
1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Click **Database Access** (left sidebar)
3. Find user: `andriuskeviciusernestas_db_user`
4. Click **Edit**
5. Click **Edit Password**
6. Click **Autogenerate Secure Password** 
7. **COPY** the new password immediately
8. Open `.env` file and update the password in MONGODB_URI
9. Run: `npm run test-db`

This should resolve the TLS/SSL error.

