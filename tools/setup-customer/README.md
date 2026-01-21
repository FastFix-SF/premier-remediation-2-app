# Customer Setup CLI Tool

Automate the deployment of your construction admin system for new customers. This tool updates all branding, configuration, and environment files in seconds.

## Quick Start

### Option 1: Using a config file (recommended)

1. Copy the example config:
```bash
cp tools/setup-customer/example-customer.json tools/setup-customer/my-new-customer.json
```

2. Edit `my-new-customer.json` with your customer's details

3. Run the setup:
```bash
node tools/setup-customer/setup-customer.js --config tools/setup-customer/my-new-customer.json
```

### Option 2: Interactive mode

```bash
node tools/setup-customer/setup-customer.js --interactive
```

The wizard will prompt you for all required information.

## What Gets Updated

| File | Changes |
|------|---------|
| `src/config/company.ts` | Company name, contact info, address, social links, SEO |
| `index.html` | Title, meta tags, OG images, favicon, theme color |
| `public/manifest.webmanifest` | PWA app name, theme colors |
| `capacitor.config.json` | Mobile app ID and name |
| `.env` | Supabase project credentials |
| `src/index.css` | Brand colors (primary, accent) |

## Configuration Schema

See `customer-config.schema.json` for the full schema. Required fields:

```json
{
  "company": {
    "name": "Company Name",
    "legalName": "COMPANY NAME, LLC",
    "shortName": "Company",
    "phone": "(555) 123-4567",
    "email": "info@company.com",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    }
  },
  "supabase": {
    "projectId": "your-project-id",
    "publishableKey": "eyJhbGc...",
    "url": "https://your-project-id.supabase.co"
  }
}
```

## Full Workflow: New Customer Setup

```bash
# 1. Clone the template repo
git clone https://github.com/your-org/construction-admin-template.git new-customer-name
cd new-customer-name

# 2. Remove git history and reinitialize
rm -rf .git
git init

# 3. Create your customer config
cp tools/setup-customer/example-customer.json tools/setup-customer/acme-construction.json
# Edit acme-construction.json with customer details

# 4. Run the setup tool
node tools/setup-customer/setup-customer.js --config tools/setup-customer/acme-construction.json

# 5. Add logo and icons
# Copy customer logo to public/lovable-uploads/
# Update icons in public/icons/

# 6. Create new GitHub repo
gh repo create acme-construction-admin --private --source=. --push

# 7. Deploy to Lovable or your hosting platform
```

## Customizing Colors

The tool supports HSL color format for CSS variables:

```json
{
  "branding": {
    "colors": {
      "primary": "205 50% 21%",    // Deep blue
      "accent": "25 95% 55%",       // Orange
      "themeColor": "#0b3040"       // Hex for PWA
    }
  }
}
```

Common color presets by industry:
- **Roofing**: `primary: "205 50% 21%"` (steel blue)
- **Solar**: `primary: "45 93% 47%"` (golden yellow)
- **Plumbing**: `primary: "200 80% 40%"` (water blue)
- **Electrical**: `primary: "48 96% 53%"` (electric yellow)
- **General Contractor**: `primary: "220 15% 25%"` (charcoal)

## Troubleshooting

**Error: Config file not found**
- Make sure the path to your config file is correct
- Use absolute paths if relative paths don't work

**Error: Invalid configuration**
- Ensure `company.name` and `supabase.projectId` are provided
- Check JSON syntax in your config file

**Changes not appearing**
- Clear your browser cache
- Restart the dev server: `npm run dev`

## Contributing

To add new configurable fields:

1. Update `customer-config.schema.json` with the new field
2. Update `generateCompanyTs()` in `setup-customer.js`
3. Add the update logic in the appropriate `update*()` function
4. Update this README
